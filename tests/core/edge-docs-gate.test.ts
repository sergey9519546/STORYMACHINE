// edge.yml must not rebuild an image the commit cannot have changed — and it
// must not SKIP one the commit did change.
//
// ── Why this file exists ───────────────────────────────────────────────────
//
// `.github/workflows/ci.yml` gained a docs-only fast path on 2026-09-18: a
// push whose every file is documentation finishes CI in ~1-2 minutes instead
// of ~9, and still concludes `success`. A `success` on `main` is exactly what
// triggers `.github/workflows/edge.yml`, so the pushes that were just made
// cheap were the ones buying a full `docker build --push` of an image with
// identical contents. `edge.yml` cannot read CI's answer — a `workflow_run`
// payload carries `head_sha`/`head_branch`/`conclusion`, never the upstream
// run's job outputs — so it re-derives the classification itself.
//
// ── The bug this file exists to have caught ────────────────────────────────
//
// The obvious patch gates on `classifyDocsOnly`, the same predicate ci.yml
// uses. That is WRONG here, and provably so. `.dockerignore` denies `**` and
// then re-includes `!server/**`, `!src/**`, `!public/**`. Thirteen committed
// `*.md` files live under those trees; they enter the build context (verified
// by building a probe image with `COPY . .` and listing it), and
// `Dockerfile:91` copies `/app/server` into the runner stage, so they are in
// the published image. `classifyDocsOnly(['server/nvm/kernel/README.md'])` is
// `true` — correct for "which CI gates can this affect", wrong for "can this
// change the image".
//
// So `edge.yml` gates on `canSkipImageBuild`, which is narrower: `docs/**`
// and ROOT-LEVEL `*.md` only. This file pins both the predicate and the two
// `.dockerignore` facts it rests on, so a future `!CHANGELOG.md` breaks a
// test rather than silently making the gate wrong.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canSkipImageBuild, isOutsideDockerBuildContext, classifyDocsOnly } from '../../scripts/lib/docs-only.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const EDGE_YML = path.join(ROOT, '.github/workflows/edge.yml');
const DOCKERIGNORE = path.join(ROOT, '.dockerignore');

/** `.dockerignore`'s live patterns, comments and blanks removed. */
function dockerignorePatterns(): string[] {
  return fs.readFileSync(DOCKERIGNORE, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
}

describe('the two .dockerignore facts canSkipImageBuild rests on', () => {
  it('denies the whole workspace before any allowlist', () => {
    const patterns = dockerignorePatterns();
    assert.ok(
      patterns.includes('**'),
      '.dockerignore must keep its blanket `**` deny. Without it, "not explicitly allowlisted" no longer '
      + 'means "outside the build context", and canSkipImageBuild\'s root-*.md arm becomes unsound.',
    );
    assert.equal(
      patterns.indexOf('**'), patterns.findIndex((p) => !p.startsWith('!')),
      'the blanket deny must come before any other rule — Moby applies the LAST matching pattern, so a '
      + 'deny placed after an allowlist would change what the allowlist means',
    );
  });

  it('no negation can re-include docs/** or a root-level *.md', () => {
    // Syntactic and deliberately blunt: any negation that so much as mentions
    // docs or markdown forces a human back to canSkipImageBuild's header
    // rather than silently widening the build context under it.
    const offenders = dockerignorePatterns()
      .filter((p) => p.startsWith('!'))
      .map((p) => p.slice(1).trim())
      .filter((p) => /^\.?\/?docs(\/|$)/.test(p) || /\.md$/i.test(p) || p === '*' || p === '**');
    assert.deepEqual(
      offenders,
      [],
      'a negation here would pull documentation INTO the Docker build context, which would make edge.yml\'s '
      + 'skip gate skip a build that changes the image. If this is deliberate, canSkipImageBuild in '
      + 'scripts/lib/docs-only.mjs has to change in the same diff.',
    );
  });

  it('server/**, src/** and public/** ARE re-included — the reason the gate is narrow', () => {
    const negations = dockerignorePatterns().filter((p) => p.startsWith('!')).map((p) => p.slice(1));
    for (const tree of ['server/**', 'src/**', 'public/**']) {
      assert.ok(
        negations.includes(tree),
        `.dockerignore is expected to re-include ${tree}; if it no longer does, canSkipImageBuild could be `
        + 'widened — but widening it is a decision, not a cleanup',
      );
    }
    const inContextMarkdown = execFileSync('git', ['ls-files', 'server/**/*.md', 'src/**/*.md', 'public/**/*.md'],
      { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
    assert.ok(
      inContextMarkdown.length > 0,
      'this test is only meaningful while markdown really does live under an allowlisted tree',
    );
    for (const file of inContextMarkdown) {
      assert.equal(classifyDocsOnly([file]), true, `${file} is docs to CI's classifier`);
      assert.equal(
        canSkipImageBuild([file]), false,
        `${file} is docs to CI but IS in the Docker build context and in the image (Dockerfile copies `
        + '/app/server, /app/src/lib, /app/public), so it must never skip an image build. This is the '
        + 'exact divergence between the two predicates, and it is the bug the naive patch would have shipped.',
      );
    }
  });
});

describe('canSkipImageBuild — narrower than classifyDocsOnly, in the safe direction', () => {
  const SKIPPABLE: string[][] = [
    ['docs/PATH_TO_EXCELLENCE.md'],
    ['docs/brain/brain.graph.json'],
    ['docs/audits/x/README.md', 'docs/audits/x/review.md'],
    ['README.md'],
    ['CLAUDE.md', 'ROADMAP.md', 'docs/DECISION_LOG.md'],
  ];
  const NOT_SKIPPABLE: string[][] = [
    ['server/nvm/kernel/README.md'],
    ['src/components/ScriptIDE.tsx'],
    ['public/notes.md'],
    ['docs/a.md', 'server/nvm/kernel/README.md'],
    ['.github/workflows/edge.yml'],
    ['Dockerfile'],
    ['.dockerignore'],
    ['package.json'],
    ['tests/core/edge-docs-gate.test.ts'],
    [],
  ];

  for (const files of SKIPPABLE) {
    it(`${JSON.stringify(files)} -> skippable`, () => assert.equal(canSkipImageBuild(files), true));
  }
  for (const files of NOT_SKIPPABLE) {
    it(`${JSON.stringify(files)} -> NOT skippable`, () => assert.equal(canSkipImageBuild(files), false));
  }

  it('is strictly narrower than classifyDocsOnly, never wider', () => {
    // The invariant that makes swapping one for the other safe in one
    // direction only: anything that can skip an image build is also docs to
    // CI, but not the reverse.
    const corpus = [
      'docs/a.md', 'README.md', 'CLAUDE.md', 'docs/brain/x.json',
      'server/nvm/kernel/README.md', 'src/lib/notes.md', 'public/a.md',
      'server/app.ts', 'package.json', 'Dockerfile', 'tests/a.test.ts',
    ];
    for (const f of corpus) {
      if (isOutsideDockerBuildContext(f)) {
        assert.equal(classifyDocsOnly([f]), true, `${f} may not be skippable-but-not-docs`);
      }
    }
  });

  it('malformed input is never skippable', () => {
    assert.equal(canSkipImageBuild(null as unknown as string[]), false);
    assert.equal(canSkipImageBuild('docs/a.md' as unknown as string[]), false);
    assert.equal(canSkipImageBuild(['docs/a.md', null as unknown as string]), false);
    assert.equal(isOutsideDockerBuildContext(undefined as unknown as string), false);
    assert.equal(isOutsideDockerBuildContext(''), false);
  });
});

// ── The step's real shell body, run against real repositories ──────────────
//
// The assertions above are about a predicate. These run the `run:` script
// EXTRACTED FROM edge.yml ITSELF, so a wiring mistake — a dropped
// `--no-renames`, a wrong module path, a failure direction inverted — fails
// here rather than on `main`.
describe('edge.yml\'s gate step, extracted and executed', () => {
  const tmpRoots: string[] = [];

  function stepBody(): string {
    // Deliberately a hand walk rather than a YAML library: this repository
    // vendors no YAML parser (see ci-gates-intact.test.ts's own note), and the
    // step is found by its `id:` so a rename of the step cannot silently make
    // this suite test nothing — `assert.ok` below fails instead.
    const lines = fs.readFileSync(EDGE_YML, 'utf8').split('\n');
    const idIdx = lines.findIndex((l) => l.trim() === 'id: docsonly');
    assert.notEqual(idIdx, -1, 'edge.yml must keep a step with `id: docsonly`');
    const runIdx = lines.findIndex((l, i) => i > idIdx && /^\s*run:\s*\|\s*$/.test(l));
    assert.notEqual(runIdx, -1, 'the docsonly step must keep a `run: |` block');
    const base = lines[runIdx + 1].search(/\S/);
    const body: string[] = [];
    for (let i = runIdx + 1; i < lines.length; i++) {
      if (lines[i].trim() === '') { body.push(''); continue; }
      if (lines[i].search(/\S/) < base) break;
      body.push(lines[i].slice(base));
    }
    return body.join('\n');
  }

  function fixture(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-gate-'));
    tmpRoots.push(dir);
    const env = {
      PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: dir,
      GIT_CONFIG_GLOBAL: path.join(dir, 'none'), GIT_CONFIG_SYSTEM: path.join(dir, 'none'),
      GIT_AUTHOR_NAME: 'F', GIT_AUTHOR_EMAIL: 'f@example.invalid',
      GIT_COMMITTER_NAME: 'F', GIT_COMMITTER_EMAIL: 'f@example.invalid',
    };
    execFileSync('git', ['init', '-q', '-b', 'main', '.'], { cwd: dir, env });
    fs.mkdirSync(path.join(dir, 'scripts/lib'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts/lib/docs-only.mjs'), path.join(dir, 'scripts/lib/docs-only.mjs'));
    // Untracked, so the copied module can never appear in a classified diff.
    fs.writeFileSync(path.join(dir, '.git/info/exclude'), 'scripts/\n');
    fs.writeFileSync(path.join(dir, 'step.sh'), stepBody());
    fs.appendFileSync(path.join(dir, '.git/info/exclude'), 'step.sh\n');
    return dir;
  }

  function git(dir: string, args: string[]): string {
    return execFileSync('git', args, {
      cwd: dir, encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: dir,
        GIT_CONFIG_GLOBAL: path.join(dir, 'none'), GIT_CONFIG_SYSTEM: path.join(dir, 'none'),
        GIT_AUTHOR_NAME: 'F', GIT_AUTHOR_EMAIL: 'f@example.invalid',
        GIT_COMMITTER_NAME: 'F', GIT_COMMITTER_EMAIL: 'f@example.invalid',
      },
    }).trim();
  }

  function write(dir: string, rel: string, text: string): void {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }

  function commit(dir: string, msg: string): string {
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '--no-gpg-sign', '-m', msg]);
    return git(dir, ['rev-parse', 'HEAD']);
  }

  /** Runs the extracted body; returns the `$GITHUB_OUTPUT` value and exit code. */
  function runStep(dir: string, headSha: string): { output: string; code: number; stdout: string } {
    const outFile = path.join(dir, 'gh-output.txt');
    fs.writeFileSync(outFile, '');
    let stdout = '';
    let code = 0;
    try {
      stdout = execFileSync('bash', ['step.sh'], {
        cwd: dir, encoding: 'utf8',
        env: {
          PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: dir,
          HEAD_SHA: headSha, GITHUB_OUTPUT: outFile,
        },
      });
    } catch (err) {
      const e = err as { stdout?: string; status?: number };
      stdout = e.stdout ?? '';
      code = e.status ?? 1;
    }
    return { output: fs.readFileSync(outFile, 'utf8').trim(), code, stdout };
  }

  function base(dir: string): string {
    write(dir, 'docs/a.md', 'a\n');
    write(dir, 'README.md', 'r\n');
    write(dir, 'server/app.ts', 'export const a = 1;\n'.repeat(30));
    write(dir, 'server/nvm/kernel/README.md', 'k\n');
    return commit(dir, 'base');
  }

  it('a docs/** change skips the build', () => {
    const dir = fixture(); base(dir);
    write(dir, 'docs/a.md', 'a2\n');
    const head = commit(dir, 'docs only');
    const r = runStep(dir, head);
    assert.equal(r.output, 'docs_only=true');
    assert.equal(r.code, 0);
  });

  it('a root-level *.md change skips the build', () => {
    const dir = fixture(); base(dir);
    write(dir, 'README.md', 'r2\n');
    const head = commit(dir, 'readme');
    assert.equal(runStep(dir, head).output, 'docs_only=true');
  });

  it('a *.md change under server/ BUILDS — it is in the image', () => {
    const dir = fixture(); base(dir);
    write(dir, 'server/nvm/kernel/README.md', 'k2\n');
    const head = commit(dir, 'server markdown');
    const r = runStep(dir, head);
    assert.equal(r.output, 'docs_only=false',
      'server/**/*.md enters the build context and the image; skipping here would publish a stale :edge');
    assert.match(r.stdout, /server\/nvm\/kernel\/README\.md/);
  });

  it('a code change builds', () => {
    const dir = fixture(); base(dir);
    write(dir, 'server/app.ts', 'export const a = 2;\n'.repeat(30));
    const head = commit(dir, 'code');
    assert.equal(runStep(dir, head).output, 'docs_only=false');
  });

  it('a rename server/*.ts -> docs/*.md BUILDS, and names both paths', () => {
    // The same hole `--no-renames` closes in ci.yml's classifier: git prints
    // only a detected rename's destination, so without the flag this deletes a
    // file from the image and looks like a docs-only change.
    const dir = fixture(); base(dir);
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    git(dir, ['mv', 'server/app.ts', 'docs/app.md']);
    const head = commit(dir, 'rename out of the image');
    const r = runStep(dir, head);
    assert.equal(r.output, 'docs_only=false');
    assert.match(r.stdout, /server\/app\.ts/);
    assert.match(r.stdout, /docs\/app\.md/);
  });

  it('a root commit (no parent) BUILDS, and the step still exits 0', () => {
    // FAIL OPEN, the opposite of ci.yml's classifier: guessing wrong here
    // means a missing or stale :edge, which is visible and recoverable, while
    // over-building costs one runner slot. And the step must never fail the
    // job — a red step here would block a publish rather than allow one.
    const dir = fixture();
    const head = base(dir);
    const r = runStep(dir, head);
    assert.equal(r.output, 'docs_only=false');
    assert.equal(r.code, 0);
    assert.match(r.stdout, /cannot diff|building/);
  });

  it('an unusable classifier BUILDS, and the step still exits 0', () => {
    const dir = fixture(); base(dir);
    write(dir, 'docs/a.md', 'a2\n');
    const head = commit(dir, 'docs only');
    fs.rmSync(path.join(dir, 'scripts/lib/docs-only.mjs'));
    const r = runStep(dir, head);
    assert.equal(r.output, 'docs_only=false', 'a broken classifier must build, never skip');
    assert.equal(r.code, 0, 'and must not fail the job, which would block the publish entirely');
  });

  it('the extracted body really is the one edge.yml runs', () => {
    const body = stepBody();
    assert.match(body, /git diff --name-only --no-renames/,
      'the gate must diff with --no-renames — a rename otherwise prints only its destination');
    assert.match(body, /scripts\/lib\/docs-only\.mjs/,
      'one implementation of the allowlist, shared with ci.yml\'s classifier');
    assert.match(body, /canSkipImageBuild/,
      'edge.yml must use the narrow image predicate, NOT classifyDocsOnly — see this file\'s header');
    assert.doesNotMatch(body, /\bclassifyDocsOnly\b/,
      'classifyDocsOnly treats server/**/*.md as docs, which is wrong for the image');
    assert.match(body, /HEAD_SHA/,
      'the SHA must arrive through env, not interpolated into the shell body');
  });
});
