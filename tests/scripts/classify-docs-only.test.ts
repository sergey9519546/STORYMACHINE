// The IMPURE half of the docs-only fast-path classifier —
// scripts/classify-docs-only.mjs — driven against REAL git repositories.
//
// WHY THIS FILE EXISTS. Round 1 of lane/ci-docs-fast-path shipped 21 green
// unit tests over the PURE half (scripts/lib/docs-only.mjs) and zero tests
// over the impure half, and documented the impure half's failure directions
// in a prose table in the audit README. The independent review then found two
// defects, both of them in the untested file:
//
//   * a rename OUT of `server/` INTO `docs/` classified DOCS-ONLY, because
//     `git diff --name-only` prints only a detected rename's DESTINATION, so
//     a push deleting a TypeScript module from server/** skipped the type
//     check, no-console, reachability, the whole `npm test`, the scoring
//     receipt guard, metamorphic, build, and the entire `browser` job;
//   * `github.event.before` is not a validated base on any ref that
//     `cancel-in-progress` applies to, so a lane branch could end up green
//     over code no completed run ever tested.
//
// A prose table is not a test (LANE_STANDARD §3). Every row of that table is
// an assertion here instead, plus the two defects above, plus the cases the
// review asked for by name: all-zeros / garbage / unresolvable `before`, a
// missing event name, unrecognized events, zero changed files, a shallow
// clone, and a merge with an unresolvable merge base.
//
// HOW IT DRIVES THE REAL SCRIPT. classify-docs-only.mjs resolves its
// repository root from its own `__dirname`, so the fixtures COPY the real
// script bytes (and both libs it imports) into `<fixture>/scripts/` and run
// them there. The first case in this file asserts those copies are
// byte-identical to the committed files, so the suite can never drift into
// testing a paraphrase of the thing it is meant to guard.
//
// ENVIRONMENT HYGIENE (LANE_STANDARD §4, the 2026-09-13 ci-env findings).
// Every child process below gets an env built FROM SCRATCH — never
// `{ ...process.env }` — so a runner's ambient GITHUB_* / RUN_E2E state
// cannot leak into a fixture that is supposed to see a clean environment.
// That leak is exactly what made two suites pass on the sandbox and fail on
// the runner; a classifier whose whole job is to read GITHUB_* variables is
// the last place to repeat it.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const SCRIPT_FILES = [
  'scripts/classify-docs-only.mjs',
  'scripts/lib/docs-only.mjs',
  'scripts/lib/validated-base.mjs',
];

const tmpRoots: string[] = [];

after(() => {
  for (const dir of tmpRoots) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

/** A throwaway directory that `after` removes. */
function tmpDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

/** Env for a child process, built from scratch — see the header. */
function cleanEnv(home: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: home,
    // Pin git's configuration to the fixture repo's own file. Without this a
    // developer's ~/.gitconfig (or a runner's system config) could set
    // `diff.renames`, `core.quotePath`, `diff.renameLimit` or an alias and
    // change what this suite is measuring.
    GIT_CONFIG_GLOBAL: path.join(home, 'no-such-gitconfig'),
    GIT_CONFIG_SYSTEM: path.join(home, 'no-such-gitconfig'),
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
    ...extra,
  };
}

function git(repo: string, args: string[], env?: Record<string, string>): string {
  return execFileSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: env ?? cleanEnv(repo),
  }).trim();
}

function write(repo: string, rel: string, contents: string): void {
  const abs = path.join(repo, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
}

/** Creates an initialized fixture repo carrying verbatim copies of the scripts. */
function makeRepo(prefix = 'classify-fixture-'): string {
  const repo = tmpDir(prefix);
  git(repo, ['init', '-q', '-b', 'main', '.']);
  for (const rel of SCRIPT_FILES) {
    const dest = path.join(repo, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, rel), dest);
  }
  // The script copies stay UNTRACKED on purpose: `git diff <a>..<b>` reports
  // only committed content, so they can never appear in a classified
  // changed-file set and skew a case.
  fs.writeFileSync(path.join(repo, '.git/info/exclude'), 'scripts/\n');
  return repo;
}

/** `git mv`, creating the destination directory first — git will not. */
function gitMv(repo: string, from: string, to: string): void {
  fs.mkdirSync(path.dirname(path.join(repo, to)), { recursive: true });
  git(repo, ['mv', from, to]);
}

function commit(repo: string, message: string): string {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '--no-gpg-sign', '-m', message]);
  return git(repo, ['rev-parse', 'HEAD']);
}

type RunResult = { stdout: string; docsOnly: boolean | null; exitCode: number };

/** Runs the real classifier in `repo` and parses the `docs_only=` line. */
function classify(repo: string, env: Record<string, string>): RunResult {
  let stdout = '';
  let exitCode = 0;
  try {
    stdout = execFileSync(process.execPath, ['scripts/classify-docs-only.mjs'], {
      cwd: repo,
      encoding: 'utf8',
      env: cleanEnv(repo, env),
    });
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    stdout = e.stdout ?? '';
    exitCode = e.status ?? 1;
  }
  const m = /^docs_only=(true|false)$/m.exec(stdout);
  return { stdout, docsOnly: m ? m[1] === 'true' : null, exitCode };
}

/**
 * A loopback stand-in for GitHub's
 * `GET /repos/{o}/{r}/actions/workflows/{wf}/runs` endpoint. This is not a
 * test hook in the production script: `GITHUB_API_URL` is Actions' own
 * variable, and pointing it at a stub is how the real fetch path gets
 * exercised without a network.
 *
 * IT RUNS IN ITS OWN PROCESS, deliberately. An in-process `http.createServer`
 * cannot answer a request made by a child started with `execFileSync`,
 * because that call BLOCKS this process's event loop for the child's whole
 * lifetime — the connection is never accepted, the classifier's fetch hits
 * its 15-second abort, and every case in this file "passes" for the wrong
 * reason (an unreachable API is also `docs_only=false`). Measured before the
 * split: 15,150 ms per invocation and the stub's own request log empty.
 *
 * The child reads its response from a JSON file on every request, so a test
 * changes the API's behavior by writing that file — no IPC, and nothing that
 * needs this process's event loop while a child is running.
 */
const STUB_SOURCE = `
const http = require('node:http');
const fs = require('node:fs');
const server = http.createServer((req, res) => {
  fs.appendFileSync(process.env.STUB_LOG, req.url + '\\n');
  let cfg = { status: 200, body: { workflow_runs: [] } };
  try { cfg = JSON.parse(fs.readFileSync(process.env.STUB_CONFIG, 'utf8')); } catch (e) { /* defaults */ }
  res.writeHead(cfg.status, { 'content-type': 'application/json' });
  res.end(typeof cfg.body === 'string' ? cfg.body : JSON.stringify(cfg.body));
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(process.env.STUB_PORT_FILE, String(server.address().port));
});
`;

class RunsApi {
  child: ReturnType<typeof spawn> | null = null;
  dir = '';
  url = '';

  get configFile(): string { return path.join(this.dir, 'config.json'); }
  get portFile(): string { return path.join(this.dir, 'port'); }
  get logFile(): string { return path.join(this.dir, 'requests.log'); }

  async start(): Promise<void> {
    this.dir = tmpDir('classify-runs-api-');
    fs.writeFileSync(this.logFile, '');
    this.reset();
    this.child = spawn(process.execPath, ['-e', STUB_SOURCE], {
      stdio: 'ignore',
      env: cleanEnv(this.dir, {
        STUB_CONFIG: this.configFile,
        STUB_PORT_FILE: this.portFile,
        STUB_LOG: this.logFile,
      }),
    });
    const deadline = Date.now() + 10_000;
    while (!fs.existsSync(this.portFile)) {
      if (Date.now() > deadline) throw new Error('the runs-API stub never reported a port');
      await new Promise((r) => setTimeout(r, 10));
    }
    this.url = `http://127.0.0.1:${fs.readFileSync(this.portFile, 'utf8').trim()}`;
  }

  async stop(): Promise<void> {
    this.child?.kill('SIGKILL');
  }

  /** Every request the stub has served since the last `clearLog()`. */
  get requests(): string[] {
    try {
      return fs.readFileSync(this.logFile, 'utf8').split('\n').filter(Boolean);
    } catch { return []; }
  }

  clearLog(): void { fs.writeFileSync(this.logFile, ''); }

  respond(status: number, body: unknown): void {
    fs.writeFileSync(this.configFile, JSON.stringify({ status, body }));
  }

  reset(): void { this.respond(200, { workflow_runs: [] }); }

  /** A `workflow_runs` payload naming `sha` as the last successful tip. */
  successAt(sha: string, id = 1): void {
    this.respond(200, {
      workflow_runs: [
        { id, status: 'completed', conclusion: 'success', head_sha: sha, run_started_at: '2026-09-18T00:00:00Z' },
      ],
    });
  }
}

const api = new RunsApi();
before(async () => { await api.start(); });
after(async () => { await api.stop(); });

/** The Actions env a real `push` run presents, minus the parts under test. */
function pushEnv(before_: string, head: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    GITHUB_EVENT_NAME: 'push',
    DOCS_ONLY_BEFORE_SHA: before_,
    GITHUB_SHA: head,
    GITHUB_API_URL: api.url,
    GITHUB_REPOSITORY: 'fixture/repo',
    GITHUB_REF_NAME: 'main',
    GITHUB_WORKFLOW_REF: 'fixture/repo/.github/workflows/ci.yml@refs/heads/main',
    GITHUB_RUN_ID: '999',
    ...extra,
  };
}

describe('classify-docs-only.mjs — the fixtures drive the real script', () => {
  it('the copies under test are byte-identical to the committed scripts', () => {
    const repo = makeRepo();
    for (const rel of SCRIPT_FILES) {
      assert.deepEqual(
        fs.readFileSync(path.join(repo, rel)),
        fs.readFileSync(path.join(REPO_ROOT, rel)),
        `${rel} in the fixture must be a verbatim copy — otherwise this suite guards a paraphrase`,
      );
    }
  });
});

describe('classify-docs-only.mjs — rename detection cannot hide a non-docs change', () => {
  // BLOCKER 1 (round-2 review). `diff.renames` defaults to true and
  // `--name-only` prints only a rename's DESTINATION, so before the
  // `--no-renames` fix this case printed exactly `docs/big.md` and returned
  // docs_only=true while deleting a TypeScript module out of server/**.
  it('a rename server/*.ts -> docs/*.md is NOT docs-only, and names both paths', () => {
    const repo = makeRepo();
    write(repo, 'server/big.ts', 'export const x = 1;\n'.repeat(40));
    write(repo, 'README.md', '# fixture\n');
    const base = commit(repo, 'base');
    gitMv(repo, 'server/big.ts', 'docs/big.md');
    const head = commit(repo, 'move the module into docs/');

    api.successAt(base);
    const r = classify(repo, pushEnv(base, head));
    assert.equal(r.docsOnly, false,
      'a rename out of server/ into docs/ DELETES a server module; rename detection must not collapse '
      + 'the pair to its docs-side destination');
    assert.match(r.stdout, /server\/big\.ts/, 'the deleted source path must appear in the changed-file set');
    assert.match(r.stdout, /docs\/big\.md/, 'the destination path must appear too');
  });

  it('a rename docs/*.md -> server/*.ts is NOT docs-only, and names both paths', () => {
    // The other direction. Its DESTINATION is already non-docs, so it
    // classified `false` even before the fix — but only by luck of which side
    // git prints. Pinned so the fix cannot be half-reverted.
    const repo = makeRepo();
    write(repo, 'docs/big.md', 'prose\n'.repeat(60));
    write(repo, 'README.md', '# fixture\n');
    const base = commit(repo, 'base');
    gitMv(repo, 'docs/big.md', 'server/big.ts');
    const head = commit(repo, 'move the doc into server/');

    api.successAt(base);
    const r = classify(repo, pushEnv(base, head));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /docs\/big\.md/, 'the deleted docs path must appear in the changed-file set');
    assert.match(r.stdout, /server\/big\.ts/);
  });

  it('a rename docs/a.md -> docs/b.md IS still docs-only (the fix does not over-fire)', () => {
    const repo = makeRepo();
    write(repo, 'docs/a.md', 'prose\n'.repeat(60));
    const base = commit(repo, 'base');
    gitMv(repo, 'docs/a.md', 'docs/b.md');
    const head = commit(repo, 'rename within docs/');

    api.successAt(base);
    assert.equal(classify(repo, pushEnv(base, head)).docsOnly, true,
      '--no-renames widens the printed set, it does not change what the set MEANS: both paths are docs');
  });

  it('a COPY of a server file into docs/ (source left in place) is docs-only', () => {
    // Distinguishes the two collapses: a copy adds a docs file and changes
    // nothing under server/, so `true` is correct. A rename does not.
    const repo = makeRepo();
    write(repo, 'server/big.ts', 'export const x = 1;\n'.repeat(40));
    const base = commit(repo, 'base');
    fs.copyFileSync(path.join(repo, 'server/big.ts'), path.join(repo, 'docs-copy.md'));
    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
    fs.renameSync(path.join(repo, 'docs-copy.md'), path.join(repo, 'docs/copy.md'));
    const head = commit(repo, 'copy into docs/');

    api.successAt(base);
    assert.equal(classify(repo, pushEnv(base, head)).docsOnly, true);
  });

  it('a repo-level diff.renames=copies config cannot re-open the hole', () => {
    // `--no-renames` is applied on the command line, which outranks any
    // `diff.renames` value a repository or a runner's config could carry.
    const repo = makeRepo();
    git(repo, ['config', 'diff.renames', 'copies']);
    write(repo, 'server/big.ts', 'export const x = 1;\n'.repeat(40));
    const base = commit(repo, 'base');
    gitMv(repo, 'server/big.ts', 'docs/big.md');
    const head = commit(repo, 'move under a copies-detecting config');

    api.successAt(base);
    const r = classify(repo, pushEnv(base, head));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /server\/big\.ts/);
  });
});

describe('classify-docs-only.mjs — the base must be a VALIDATED commit, not `before`', () => {
  // BLOCKER-ADJACENT (round-2 review item 5). A lane branch's in-flight run is
  // cancelled by the next push (`cancel-in-progress` on every ref but main).
  // If push 1 carried a server change and push 2 is docs-only, chaining from
  // `before` classifies push 2 docs-only and the branch's only COMPLETED run
  // is green over code nothing ever tested.
  it('a docs-only push landing on top of a CANCELLED run re-runs everything', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A — validated by a completed run');
    write(repo, 'server/app.ts', 'export const app = 1;\n');
    const b = commit(repo, 'B — server change; its run was CANCELLED by the next push');
    write(repo, 'docs/notes.md', 'prose\n');
    const c = commit(repo, 'C — docs only');

    // The only SUCCESSFUL run on this ref is the one for A.
    api.successAt(a);
    const r = classify(repo, pushEnv(b, c));
    assert.equal(r.docsOnly, false,
      'the honest range is "since the last completed successful run" (A..C), which contains server/app.ts '
      + '— not the push range B..C');
    assert.match(r.stdout, /server\/app\.ts/);
    assert.match(r.stdout, /widened from `before`/);
  });

  it('a docs-only push whose predecessor DID complete green is still docs-only', () => {
    // The positive control for the widening: when the last successful run tip
    // IS `before`, the range is byte-identical to the pre-fix behavior and the
    // fast path still fires. Without this case the suite could be satisfied by
    // a classifier that always says `false`.
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    write(repo, 'server/app.ts', 'export const app = 1;\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B — docs only');

    api.successAt(a);
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, true);
    assert.doesNotMatch(r.stdout, /widened from `before`/,
      'when the last successful tip IS `before` the range must not widen at all');
  });

  it('a docs-only push landing on top of a FAILED run re-runs everything', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A — green');
    write(repo, 'src/main.tsx', 'export const main = 1;\n');
    const b = commit(repo, 'B — its run went RED');
    write(repo, 'docs/notes.md', 'prose\n');
    const c = commit(repo, 'C — docs only');

    api.successAt(a); // B's run is absent from a status=success listing
    const r = classify(repo, pushEnv(b, c));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /src\/main\.tsx/);
  });

  it('no successful prior run on this ref is NOT docs-only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B — docs only');

    api.reset();
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /cannot establish a validated base/);
  });

  it('a successful run whose tip is NOT an ancestor of HEAD is rejected', () => {
    // The force-push / rebase shape: the recorded tip is real but describes a
    // history this checkout no longer contains.
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    commit(repo, 'A');
    git(repo, ['checkout', '-q', '--orphan', 'sidetrack']);
    write(repo, 'other.txt', 'unrelated root\n');
    const orphan = commit(repo, 'unrelated root commit');
    git(repo, ['checkout', '-q', 'main']);
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B — docs only');
    const a = git(repo, ['rev-parse', 'HEAD^']);

    api.successAt(orphan);
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /cannot establish a validated base/);
  });

  it('a merge whose validated tip has NO merge base with `before` is NOT docs-only', () => {
    // Unrelated histories joined by a merge: the tip resolves AND is an
    // ancestor of HEAD, so it passes the usability check, but `git merge-base`
    // against `before` has no answer at all.
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A on main');
    git(repo, ['checkout', '-q', '--orphan', 'unrelated']);
    fs.rmSync(path.join(repo, 'README.md'));
    write(repo, 'other.txt', 'unrelated root\n');
    const orphan = commit(repo, 'unrelated root');
    git(repo, ['checkout', '-q', 'main']);
    git(repo, ['merge', '-q', '--no-gpg-sign', '--allow-unrelated-histories', '-m', 'merge', 'unrelated']);
    write(repo, 'docs/notes.md', 'prose\n');
    const head = commit(repo, 'docs only after the merge');

    api.successAt(orphan);
    const r = classify(repo, pushEnv(a, head));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /no merge base|cannot establish a validated base/);
  });

  it('the API is queried for THIS workflow, THIS ref, successes only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B');
    api.clearLog();
    api.successAt(a);
    classify(repo, pushEnv(a, b, { GITHUB_REF_NAME: 'lane/ci-docs-fast-path' }));
    assert.equal(api.requests.length, 1);
    const url = api.requests[0];
    assert.match(url, /\/repos\/fixture\/repo\/actions\/workflows\/ci\.yml\/runs\?/);
    assert.match(url, /branch=lane%2Fci-docs-fast-path/);
    assert.match(url, /status=success/);
  });

  it('the run that is currently executing cannot nominate itself as the base', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B');
    api.respond(200, {
      workflow_runs: [
        { id: 999, status: 'completed', conclusion: 'success', head_sha: b, run_started_at: '2026-09-18T02:00:00Z' },
        { id: 1, status: 'completed', conclusion: 'success', head_sha: a, run_started_at: '2026-09-18T01:00:00Z' },
      ],
    });
    const r = classify(repo, pushEnv(a, b, { GITHUB_RUN_ID: '999' }));
    assert.equal(r.docsOnly, true, 'run 999 is THIS run and must be skipped; the base falls back to A');
    assert.match(r.stdout, new RegExp(a.slice(0, 12)));
  });
});

describe('classify-docs-only.mjs — every unresolvable input fails CLOSED', () => {
  type Ctx = { repo: string; a: string; b: string };
  type Row = {
    name: string;
    env: (ctx: Ctx) => Record<string, string>;
    /** Optional per-row API state; the default names `a` as the last green tip. */
    api?: (ctx: Ctx) => void;
    expect?: RegExp;
  };
  const ROWS: Row[] = [
    {
      name: 'no GITHUB_EVENT_NAME (a local or manual invocation)',
      env: () => ({ GITHUB_API_URL: api.url }),
      expect: /no GITHUB_EVENT_NAME/,
    },
    {
      name: '`before` is the all-zeros sentinel (this push created the ref)',
      env: ({ b }) => pushEnv('0'.repeat(40), b),
      expect: /all-zeros sentinel/,
    },
    {
      name: '`before` is 40 hex that does not resolve in this checkout',
      env: ({ b }) => pushEnv('d'.repeat(40), b),
      expect: /does not resolve in this checkout/,
    },
    {
      name: '`before` is a shell-injection attempt',
      env: ({ b }) => pushEnv('"; rm -rf / #', b),
      expect: /does not resolve in this checkout/,
    },
    {
      name: '`before` is empty',
      env: ({ b }) => pushEnv('', b),
      expect: /no resolvable `before` SHA/,
    },
    {
      name: 'the push is a force-push, declared only through DOCS_ONLY_FORCED',
      // The round-1 asymmetry: `before` had an env fallback and `forced` did
      // not, so with GITHUB_EVENT_PATH unreadable a force-push read as normal.
      env: ({ a, b }) => pushEnv(a, b, { DOCS_ONLY_FORCED: 'true' }),
      expect: /force-push/,
    },
    {
      name: 'the push is a force-push, declared only through the event payload',
      env: ({ a, b, repo }) => {
        const p = path.join(repo, 'event.json');
        fs.writeFileSync(p, JSON.stringify({ forced: true, before: a }));
        return pushEnv(a, b, { GITHUB_EVENT_PATH: p });
      },
      expect: /force-push/,
    },
    {
      name: 'an unrecognized event (workflow_dispatch)',
      env: ({ b }) => ({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_SHA: b, GITHUB_API_URL: api.url }),
      expect: /unrecognized GITHUB_EVENT_NAME/,
    },
    {
      name: 'an unrecognized event (schedule)',
      env: ({ b }) => ({ GITHUB_EVENT_NAME: 'schedule', GITHUB_SHA: b, GITHUB_API_URL: api.url }),
      expect: /unrecognized GITHUB_EVENT_NAME/,
    },
    {
      name: 'zero changed files (the validated base is already HEAD)',
      // The empty-set rule lives in the PURE half and must survive the
      // validated-base widening: when nothing at all separates the base from
      // the head, the set is empty and an empty set is never docs-only.
      // (`before === head` with an OLDER validated base is a different case
      // and correctly widens — see the cancelled-run suite above.)
      env: ({ b }) => pushEnv(b, b),
      api: ({ b }) => api.successAt(b),
    },
    {
      name: 'a pull_request event with no resolvable origin/main',
      env: () => ({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_API_URL: api.url }),
      expect: /origin\/main does not resolve/,
    },
    {
      name: 'GITHUB_API_URL is unset (no way to learn what was validated)',
      env: ({ a, b }) => { const e = pushEnv(a, b); delete e.GITHUB_API_URL; return e; },
      expect: /GITHUB_API_URL is not set/,
    },
    {
      name: 'GITHUB_WORKFLOW_REF is missing',
      env: ({ a, b }) => { const e = pushEnv(a, b); delete e.GITHUB_WORKFLOW_REF; return e; },
      expect: /workflow file name/,
    },
    {
      name: 'GITHUB_WORKFLOW_REF tries to escape the runs endpoint path',
      env: ({ a, b }) => pushEnv(a, b, { GITHUB_WORKFLOW_REF: 'o/r/.github/workflows/../../../evil@refs/heads/main' }),
      expect: /workflow file name/,
    },
    {
      name: 'GITHUB_REPOSITORY is malformed',
      env: ({ a, b }) => pushEnv(a, b, { GITHUB_REPOSITORY: 'not a repo slug' }),
      expect: /GITHUB_REPOSITORY is missing or malformed/,
    },
  ];

  for (const row of ROWS) {
    it(`${row.name} -> docs_only=false`, () => {
      const repo = makeRepo();
      write(repo, 'README.md', '# fixture\n');
      const a = commit(repo, 'A');
      write(repo, 'docs/notes.md', 'prose\n');
      const b = commit(repo, 'B — docs only, so only the ENV can make this false');
      const ctx = { repo, a, b };
      if (row.api) row.api(ctx); else api.successAt(a);
      const r = classify(repo, row.env(ctx));
      assert.equal(r.docsOnly, false, `${row.name} must fail closed`);
      if (row.expect) assert.match(r.stdout, row.expect);
    });
  }

  it('a non-200 from the runs API is NOT docs-only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B');
    api.respond(403, { message: 'Forbidden' });
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /runs API returned HTTP 403/);
    api.reset();
  });

  it('a malformed runs payload is NOT docs-only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B');
    api.respond(200, 'not json at all');
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, false);
    api.reset();
  });

  it('an unreachable runs API is NOT docs-only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/notes.md', 'prose\n');
    const b = commit(repo, 'B');
    // Port 1 on loopback: nothing listens, connection refused immediately.
    const r = classify(repo, pushEnv(a, b, { GITHUB_API_URL: 'http://127.0.0.1:1' }));
    assert.equal(r.docsOnly, false);
    assert.match(r.stdout, /runs API request failed|cannot establish a validated base/);
  });

  it('a SHALLOW clone (the `before` commit absent) is NOT docs-only', () => {
    const origin = makeRepo('classify-origin-');
    write(origin, 'README.md', '# fixture\n');
    const a = commit(origin, 'A');
    write(origin, 'docs/notes.md', 'prose\n');
    const b = commit(origin, 'B — docs only');

    const shallow = tmpDir('classify-shallow-');
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${origin}`, shallow], {
      env: cleanEnv(shallow), encoding: 'utf8',
    });
    for (const rel of SCRIPT_FILES) {
      const dest = path.join(shallow, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(REPO_ROOT, rel), dest);
    }
    assert.equal(git(shallow, ['rev-list', '--count', 'HEAD']), '1', 'the fixture clone must really be shallow');

    api.successAt(a);
    const r = classify(shallow, pushEnv(a, b));
    assert.equal(r.docsOnly, false, 'a depth-1 checkout cannot resolve `before`; that must not read as "nothing changed"');
    assert.match(r.stdout, /does not resolve in this checkout/);
  });

  it('a path git has to C-quote (control character) is NOT docs-only', {
    // The fixture needs a file whose NAME holds a newline. Windows cannot
    // create one, and Windows git refuses the path outright even in the index
    // ("error: Invalid path", core.protectNTFS) — so no Windows repository can
    // contain it. The classifier runs in CI on Linux, where this case runs.
    skip: process.platform === 'win32' && 'Windows cannot create, nor git on Windows index, a path containing a control character',
  }, () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    fs.mkdirSync(path.join(repo, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'docs/a\nserver-evil.md'), 'x');
    const b = commit(repo, 'B');
    api.successAt(a);
    const r = classify(repo, pushEnv(a, b));
    assert.equal(r.docsOnly, false,
      'git C-quotes a control character in a path REGARDLESS of core.quotePath, and the leading quote '
      + 'defeats both allowlist arms — the conservative direction');
  });
});

describe('classify-docs-only.mjs — the positive path, so the suite can fail both ways', () => {
  it('a genuinely docs-only push classifies docs-only and writes $GITHUB_OUTPUT', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    const a = commit(repo, 'A');
    write(repo, 'docs/audits/x/README.md', 'prose\n');
    write(repo, 'ROADMAP.md', 'phases\n');
    const b = commit(repo, 'B — docs only');
    const outFile = path.join(repo, 'gh-output.txt');
    api.successAt(a);
    const r = classify(repo, pushEnv(a, b, { GITHUB_OUTPUT: outFile }));
    assert.equal(r.docsOnly, null, 'with GITHUB_OUTPUT set the answer goes to the file, not stdout');
    assert.match(r.stdout, /DOCS-ONLY/);
    assert.equal(fs.readFileSync(outFile, 'utf8').trim(), 'docs_only=true');
  });

  it('a pull_request whose three-dot range is docs-only classifies docs-only', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    commit(repo, 'A');
    // A local `origin/main` ref, which is what the script resolves against.
    git(repo, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    write(repo, 'docs/notes.md', 'prose\n');
    commit(repo, 'B — docs only');
    const r = classify(repo, { GITHUB_EVENT_NAME: 'pull_request', GITHUB_API_URL: api.url });
    assert.equal(r.docsOnly, true);
    assert.match(r.stdout, /pull_request range origin\/main\.\.\.HEAD/);
  });

  it('a pull_request carrying a server change classifies FULL', () => {
    const repo = makeRepo();
    write(repo, 'README.md', '# fixture\n');
    commit(repo, 'A');
    git(repo, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    write(repo, 'docs/notes.md', 'prose\n');
    write(repo, 'server/app.ts', 'export const app = 1;\n');
    commit(repo, 'B');
    assert.equal(classify(repo, { GITHUB_EVENT_NAME: 'pull_request', GITHUB_API_URL: api.url }).docsOnly, false);
  });

  it('a pull_request rename out of server/ into docs/ classifies FULL', () => {
    const repo = makeRepo();
    write(repo, 'server/big.ts', 'export const x = 1;\n'.repeat(40));
    commit(repo, 'A');
    git(repo, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    gitMv(repo, 'server/big.ts', 'docs/big.md');
    commit(repo, 'B');
    const r = classify(repo, { GITHUB_EVENT_NAME: 'pull_request', GITHUB_API_URL: api.url });
    assert.equal(r.docsOnly, false, 'the hardening must be on BOTH git diff arms, not only the push one');
    assert.match(r.stdout, /server\/big\.ts/);
  });
});
