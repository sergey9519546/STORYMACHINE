// Dockerfile native-addon toolchain — the image must be able to BUILD.
//
// WHY THIS EXISTS: the Docker image had never once been built. GitHub Actions
// was blocked at the account level until 2026-09-13, so
// .github/workflows/edge.yml — 471 runs, essentially all of them `skipped` —
// had never actually executed. Its FIRST real run, **34794216577** on
// main@be2341ac (2026-09-14), failed:
//
//     > [deps 4/4] RUN npm ci:
//     npm error command sh -c node-gyp rebuild
//     npm error gyp ERR! find Python Python is not set from command line or npm configuration
//     npm error gyp ERR! stack Error: Could not find any Python installation to use
//     npm error gyp ERR! cwd /app/node_modules/better-sqlite3
//     ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1
//
// `FROM node:22-alpine` carries no python3/make/g++. .github/workflows/
// release.yml's `publish` job builds this same Dockerfile and would have
// failed identically, so the entire container delivery path was broken and
// nothing in the repository noticed. The fix adds
// `apk add --no-cache python3 make g++` to the `deps` stage; this test is what
// stops it being dropped again by someone trimming an image-size layer.
//
// WHAT node-gyp IS ACTUALLY DOING HERE (it is NOT the usual "alpine has no
// musl prebuild" story, and the difference matters if this ever has to be
// re-diagnosed): better-sqlite3 13.0.3 DOES ship a musl prebuild, bundled
// inside the npm tarball at prebuilds/linuxmusl-x64.node. Nothing is
// downloaded and there is no prebuild-install step to fail. The package has no
// `install` script; npm runs `node-gyp rebuild` implicitly because binding.gyp
// exists, and that binding.gyp is deliberately a no-op when a host prebuild is
// present — its own comment reads "npm's implicit node-gyp rebuild should do
// nothing when the package contains a prebuild for the host", and both of its
// targets become `'type': 'none'`. So no C++ is compiled. The failure is
// UPSTREAM of the compiler: node-gyp's `configure` step runs gyp, a Python
// program, before it can evaluate binding.gyp at all, and its `build` step
// then runs make over the empty generated makefiles. Measured 2026-09-18 on
// node:22-alpine, one package at a time:
//     python3 alone  -> configure passes, then "gyp ERR! ... not found: make"
//     python3 + make -> npm ci exit 0, nothing compiled, runtime resolves
//                       prebuilds/linuxmusl-x64.node
// python3 and make are therefore load-bearing; g++ is headroom for a native
// dependency that does NOT ship a musl prebuild. All three are asserted, so
// that removing the headroom is a deliberate, visible act rather than a
// silent one.
//
// This asserts the SHAPE of the Dockerfile, not its exact text: stage names,
// ordering, extra packages, extra stages and rewritten comments are all fine.
// It fails only when the stage that runs `npm ci` can no longer compile a
// native addon, when the toolchain leaks into the shipped runner stage, or
// when the stages stop agreeing about libc.
//
// Comment lines are stripped before ANY of this is evaluated, and that is not
// incidental. The live Dockerfile's explanatory comment block names all three
// packages in prose — `python3` on three separate comment lines, and "python3
// and make are therefore REQUIRED. g++ is deliberately included" — so a
// checker that merely grepped the raw file for the package names would keep
// reporting green after someone deleted the live RUN line and left the
// explanation behind. (The comment does not currently contain the string
// `apk add`, so the two-token check below would survive that particular
// deletion; it would NOT survive someone commenting the RUN line out instead,
// which is the cheaper and likelier edit.) This is the same shadowing failure
// tests/core/ci-gates-intact.test.ts was extended to catch — its "a
// commented-out correct cancel-in-progress line cannot shadow a live incorrect
// one" case. The negative fixtures at the bottom of this file pin both
// directions so the protection cannot quietly lapse.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dockerfilePath = path.join(root, 'Dockerfile');

/** Packages the stage running `npm ci` must install before it runs. */
const REQUIRED_TOOLCHAIN = ['python3', 'make', 'g++'] as const;

interface Stage {
  /** Stage alias from `AS <name>`, or the 1-based index when unnamed. */
  name: string;
  /** The image the stage is FROM, e.g. `node:22-alpine`. */
  base: string;
  /** Live (non-comment, continuation-joined) instruction lines, in order. */
  instructions: string[];
}

/**
 * Split a Dockerfile into stages of LIVE instructions only.
 *
 * Two normalizations happen here and both are load-bearing:
 *  - comment-only lines are dropped (see the header — the real Dockerfile's
 *    prose quotes the very command this file checks for);
 *  - backslash line-continuations are joined into one logical instruction, so
 *    a toolchain split across several lines still reads as one `RUN`.
 */
function parseStages(source: string): Stage[] {
  const rawLines = source.split(/\r?\n/);

  // Drop comment-only lines first, then join continuations. Doing it in this
  // order means a comment sitting INSIDE a continued instruction (legal in a
  // Dockerfile) cannot smuggle text into the joined logical line.
  const live = rawLines.filter((line) => !/^\s*#/.test(line));

  const logical: string[] = [];
  let buffer = '';
  for (const line of live) {
    if (/\\\s*$/.test(line)) {
      buffer += `${line.replace(/\\\s*$/, '')} `;
      continue;
    }
    logical.push(`${buffer}${line}`.trim());
    buffer = '';
  }
  if (buffer.trim() !== '') logical.push(buffer.trim());

  const stages: Stage[] = [];
  for (const instruction of logical) {
    if (instruction === '') continue;
    const from = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?\s*$/i.exec(instruction);
    if (from) {
      stages.push({
        name: from[2] ?? String(stages.length + 1),
        base: from[1],
        instructions: [],
      });
      continue;
    }
    if (stages.length > 0) stages[stages.length - 1].instructions.push(instruction);
  }
  return stages;
}

/** Does this logical instruction run `npm ci` (as opposed to merely naming it)? */
function isNpmCiRun(instruction: string): boolean {
  return /^RUN\b/i.test(instruction) && /\bnpm\s+ci\b/.test(instruction);
}

/** Does this logical instruction `apk add` the given package as its own token? */
function apkAdds(instruction: string, pkg: string): boolean {
  if (!/^RUN\b/i.test(instruction) || !/\bapk\s+add\b/.test(instruction)) return false;
  // `g++` is regex-hostile, so match on whitespace-delimited tokens rather
  // than building a pattern out of the package name.
  return instruction.split(/\s+/).includes(pkg);
}

/**
 * The libc family a base image implies. `node:22-alpine` is musl; the Debian
 * variants (`node:22`, `-slim`, `-bookworm`) are glibc. A native `.node` built
 * for one cannot be loaded by the other, and the runner stage copies
 * node_modules wholesale out of `builder`, so a stage that disagrees with the
 * others breaks at require() time rather than at build time.
 */
function libcFamily(base: string): 'musl' | 'glibc' {
  return /alpine/i.test(base) ? 'musl' : 'glibc';
}

/**
 * Every reason this Dockerfile could not build a native addon, as plain
 * strings. Extracted as a pure function so the negative fixtures below can
 * drive it with the pre-fix Dockerfile and assert it actually complains.
 */
function toolchainFindings(source: string): string[] {
  const stages = parseStages(source);
  const findings: string[] = [];

  if (stages.length === 0) {
    findings.push('no FROM stages found at all');
    return findings;
  }

  const compilingStages = stages.filter((stage) => stage.instructions.some(isNpmCiRun));
  if (compilingStages.length === 0) {
    findings.push('no stage runs `npm ci`; this guard no longer knows what it is guarding');
    return findings;
  }

  for (const stage of compilingStages) {
    const npmCiAt = stage.instructions.findIndex(isNpmCiRun);
    for (const pkg of REQUIRED_TOOLCHAIN) {
      const addedAt = stage.instructions.findIndex((line) => apkAdds(line, pkg));
      if (addedAt === -1) {
        findings.push(
          `stage "${stage.name}" runs \`npm ci\` without installing ${pkg} ` +
            '(run 34794216577 failed exactly this way)',
        );
      } else if (addedAt > npmCiAt) {
        findings.push(
          `stage "${stage.name}" installs ${pkg} AFTER \`npm ci\`, which is too late`,
        );
      }
    }
  }

  return findings;
}

const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

describe('Dockerfile — the native-addon toolchain that makes `npm ci` possible', () => {
  it('parses into the multi-stage build it is supposed to be', () => {
    const stages = parseStages(dockerfile);
    assert.ok(stages.length >= 2, `expected a multi-stage build, parsed ${stages.length} stage(s)`);
    assert.ok(
      stages.some((stage) => stage.instructions.some(isNpmCiRun)),
      'no stage runs `npm ci` — the parser or the Dockerfile changed shape',
    );
  });

  it('every stage that runs `npm ci` installs python3, make and g++ first (run 34794216577)', () => {
    assert.deepEqual(
      toolchainFindings(dockerfile),
      [],
      'the Docker image cannot build; see tests/core/dockerfile-toolchain.test.ts header',
    );
  });

  it('keeps the toolchain OUT of the final (runner) stage, which must stay slim', () => {
    const stages = parseStages(dockerfile);
    const runner = stages[stages.length - 1];
    assert.ok(
      !runner.instructions.some(isNpmCiRun),
      `final stage "${runner.name}" runs \`npm ci\`; the runner is supposed to copy node_modules`,
    );
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(
        !runner.instructions.some((line) => apkAdds(line, pkg)),
        `final stage "${runner.name}" installs ${pkg}; the build toolchain must not ship in the image`,
      );
    }
  });

  it('keeps every stage on the same libc, so the native binary that is installed is the one that loads', () => {
    const stages = parseStages(dockerfile);
    const families = new Set(stages.map((stage) => libcFamily(stage.base)));
    assert.equal(
      families.size,
      1,
      'stages disagree about libc: ' +
        stages.map((stage) => `${stage.name}=${stage.base} (${libcFamily(stage.base)})`).join(', ') +
        ' — a musl .node copied into a glibc runtime (or the reverse) fails at require(), not at build',
    );
  });
});

describe('Dockerfile toolchain guard — it can actually fail', () => {
  // The pre-fix `deps` stage, verbatim from main@be2341ac. This is the input
  // that produced run 34794216577's failure. If the guard does not complain
  // about THIS, it would not have caught the outage and proves nothing.
  const PRE_FIX_DEPS_STAGE = [
    'FROM node:22-alpine AS deps',
    'WORKDIR /app',
    'COPY package*.json ./',
    '# NODE_ENV is unset in this stage, so `npm ci` installs devDependencies too',
    'RUN npm ci',
    '',
    'FROM node:22-alpine AS runner',
    'CMD ["npx", "tsx", "server.ts"]',
  ].join('\n');

  it('fires on the exact pre-fix Dockerfile that broke run 34794216577', () => {
    const findings = toolchainFindings(PRE_FIX_DEPS_STAGE);
    assert.equal(
      findings.length,
      REQUIRED_TOOLCHAIN.length,
      `expected one finding per missing package, got: ${JSON.stringify(findings)}`,
    );
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(
        findings.some((finding) => finding.includes(`installing ${pkg}`)),
        `pre-fix Dockerfile should have been flagged for missing ${pkg}, findings: ${JSON.stringify(findings)}`,
      );
    }
  });

  it('does NOT fire on a Dockerfile that installs the toolchain (no false positive)', () => {
    const fixed = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache python3 make g++\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(fixed), []);
  });

  it('is not satisfied by a COMMENT that merely quotes the apk command', () => {
    // Commenting the RUN line out is the cheapest way to "temporarily" drop
    // the toolchain, and it leaves a line that still reads as correct to a
    // human skimming the file. If comments counted, that edit would go
    // unnoticed — the shadowing bug ci-gates-intact.test.ts exists to prevent,
    // applied here.
    const commentedOut = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      '# RUN apk add --no-cache python3 make g++\nCOPY package*.json ./',
    );
    assert.equal(
      toolchainFindings(commentedOut).length,
      REQUIRED_TOOLCHAIN.length,
      'a commented-out apk line must not satisfy the toolchain check',
    );
  });

  it('fires when the toolchain is installed too late to help `npm ci`', () => {
    const tooLate = PRE_FIX_DEPS_STAGE.replace(
      'RUN npm ci',
      'RUN npm ci\nRUN apk add --no-cache python3 make g++',
    );
    const findings = toolchainFindings(tooLate);
    assert.equal(findings.length, REQUIRED_TOOLCHAIN.length);
    assert.ok(findings.every((finding) => finding.includes('too late')));
  });

  it('fires when the toolchain is installed in a DIFFERENT stage than the one running `npm ci`', () => {
    const wrongStage = [
      'FROM node:22-alpine AS base',
      'RUN apk add --no-cache python3 make g++',
      '',
      'FROM node:22-alpine AS deps',
      'WORKDIR /app',
      'RUN npm ci',
      '',
      'FROM node:22-alpine AS runner',
      'CMD ["npx", "tsx", "server.ts"]',
    ].join('\n');
    assert.equal(toolchainFindings(wrongStage).length, REQUIRED_TOOLCHAIN.length);
  });

  it('detects a libc split between the building stage and the runner', () => {
    const mixed = ['FROM node:22-bookworm AS deps', 'RUN npm ci', 'FROM node:22-alpine AS runner'].join('\n');
    const families = new Set(parseStages(mixed).map((stage) => libcFamily(stage.base)));
    assert.equal(families.size, 2, 'a glibc builder feeding a musl runner must read as a split');
  });

  it('joins backslash continuations, so a wrapped apk line still counts', () => {
    const wrapped = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache \\\n    python3 \\\n    make \\\n    g++\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(wrapped), []);
  });
});
