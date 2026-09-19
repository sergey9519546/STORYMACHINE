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
// `FROM node:22-alpine`, the base then, carries no python3/make/g++, and nor
// does node:24-alpine, the base since 2026-09-18. .github/workflows/
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
// node:22-alpine, one package at a time, and repeated the same day on
// node:24-alpine when the base moved (docs/audits/2026-09-18-node-24/), with
// the same result at every layer:
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
//
// WHAT THIS GUARD ACTUALLY CHECKS, precisely (round-2 review items 1-3 —
// the round-1 version of this paragraph said "It fails only when…", which
// overclaimed in BOTH directions and three measured mutations proved it):
//
//   1. Every stage that runs `npm ci` has python3, make and g++ INSTALLED AND
//      STILL PRESENT at the moment `npm ci` runs. "Installed" means the
//      package is an argument of an actual `apk add` COMMAND — evaluated per
//      shell step, so a package name inside an `echo` string, a comment, or
//      any other command's arguments does not count, and a later `apk del`
//      takes it away again.
//   2. Ordering is evaluated at the SHELL-STEP level, not just instruction to
//      instruction, so `RUN npm ci && apk add …` reads as "too late" exactly
//      as two separate `RUN`s would.
//   3. The toolchain is NET-ABSENT at the end of the final (runner) stage.
//   4. Every stage resolves to the same libc family, following
//      `FROM <stage> AS <name>` aliases transitively to a real base image.
//
// WHERE IT FAILS CLOSED (a legitimate Dockerfile it cannot read reads as
// broken, which is the right direction for a guard but is worth knowing
// before someone rewrites this file and is surprised): a package list that
// only exists at build time — `apk add $(cat pkgs.txt)`, a package set
// assembled by a shell conditional, or an `ARG` with no default that is
// supplied only via `--build-arg` — cannot be resolved from the file text and
// reads as "not installed". Round-1 also failed closed on four shapes that
// round 2 now handles for real: an `ARG`/`ENV`-parameterised package list, a
// `RUN <<EOF` heredoc, `FROM <stage> AS <name>` stage inheritance, and
// `FROM --platform=… <image>`. Each has a fixture at the bottom of this file.
//
// Comment lines are stripped before ANY of this is evaluated, and that is not
// incidental. The live Dockerfile's explanatory comment block names all three
// packages in prose — `python3` on three separate comment lines, and "python3
// and make are therefore REQUIRED. g++ is deliberately included" — so a
// checker that merely grepped the raw file for the package names would keep
// reporting green after someone deleted the live RUN line and left the
// explanation behind. This is the same shadowing failure
// tests/core/ci-gates-intact.test.ts was extended to catch — its "a
// commented-out correct cancel-in-progress line cannot shadow a live incorrect
// one" case. The negative fixtures at the bottom of this file pin both
// directions so the protection cannot quietly lapse.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseStages, type Stage } from '../helpers/dockerfile.ts';

const root = path.resolve(import.meta.dirname, '../..');
const dockerfilePath = path.join(root, 'Dockerfile');

/** Packages the stage running `npm ci` must install before it runs. */
const REQUIRED_TOOLCHAIN = ['python3', 'make', 'g++'] as const;

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split a shell command line into the individual COMMANDS it runs, honouring
 * quotes. `&&`, `||`, `;`, `|` and newlines all separate commands.
 *
 * This is the core of round-2 review items 1 and 2. Round 1 treated a whole
 * `RUN` as one opaque string and asked only whether it contained `apk add`
 * somewhere and the package name somewhere, which made
 * `RUN apk add --no-cache curl && echo "dropped: python3 make g++"` and
 * `RUN npm ci && apk add --no-cache python3 make g++` both read as correct.
 *
 * ROUND-3 REVIEW ITEMS R2-1 and R2-2. The round-2 splitter honoured quotes but
 * not the two other things that decide where a shell command ends, and each
 * omission was a GREEN guard on an image that cannot build:
 *
 *   R2-1  `RUN apk add --no-cache curl #&& apk add --no-cache python3 make g++`
 *         An unquoted `#` at a WORD BOUNDARY starts a shell comment, so the
 *         `&&` and everything after it is dead text. Round-2 guard: 21/21
 *         GREEN. Measured in the base image shipped at the time, not argued
 *         (and re-measured on node:24-alpine, same busybox sh, same output):
 *           docker run --rm node:22-alpine sh -c 'echo one #&& echo two'  -> `one`
 *           docker run --rm node:22-alpine sh -c 'echo a#b'               -> `a#b`
 *         The second is why the boundary test matters: a `#` mid-word is an
 *         ordinary character. This hole contradicted this file's OWN header at
 *         :52-64, which argues the guard must survive "someone commenting the
 *         RUN line out… the cheaper and likelier edit" — commenting out the
 *         TAIL is that same edit, one character shorter.
 *
 *   R2-2  `RUN apk add --no-cache curl && echo "x \" && apk add … python3 make g++"`
 *         A backslash escapes the next character, so `\"` does NOT close the
 *         quote and the whole thing is one `echo` argument. Round-2 read the
 *         `\"` as a closing quote and invented a phantom `apk add` step —
 *         21/21 GREEN. Measured:
 *           docker run --rm node:22-alpine sh -c 'echo "x \" && echo SMUGGLED"'
 *             -> `x " && echo SMUGGLED`   (SMUGGLED never runs)
 *
 * Both are pinned as fixtures at the bottom of this file.
 */
function splitShellSteps(body: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    // A backslash escapes the next character everywhere except inside single
    // quotes, where it is literal. An escaped character can never open or
    // close a quote, separate a command, or start a comment — so consume the
    // pair together, before any of those tests run. (R2-2)
    if (ch === '\\' && quote !== "'") {
      current += ch;
      if (i + 1 < body.length) {
        current += body[i + 1];
        i++;
      }
      continue;
    }
    if (quote !== null) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    // An unquoted `#` at a word boundary comments out the rest of the LINE
    // (not the rest of the body — a heredoc or a newline-joined RUN has more
    // lines after it). The boundary test is what keeps `a#b` a literal word
    // and `--virtual .build-deps#1` an argument. (R2-1)
    if (ch === '#' && (i === 0 || /[\s;&|(]/.test(body[i - 1]))) {
      const newline = body.indexOf('\n', i);
      out.push(current);
      current = '';
      if (newline === -1) break;
      i = newline;
      continue;
    }
    if (ch === '\n' || ch === ';') {
      out.push(current);
      current = '';
      continue;
    }
    if ((ch === '&' && body[i + 1] === '&') || (ch === '|' && body[i + 1] === '|')) {
      out.push(current);
      current = '';
      i++;
      continue;
    }
    if (ch === '|' || ch === '&') {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((step) => step.trim()).filter((step) => step !== '');
}

/**
 * Whitespace-split a shell step into tokens, dropping quote characters.
 *
 * Backslash escapes the next character (round-3 review item R2-2, same fix
 * site as the splitter): the escaped character joins the current token
 * literally and can never close a quote or end a word. Inside single quotes a
 * backslash is itself literal, as the shell has it.
 */
function shellTokens(step: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: string | null = null;
  let quoted = false;
  for (let i = 0; i < step.length; i++) {
    const ch = step[i];
    if (ch === '\\' && quote !== "'") {
      if (i + 1 < step.length) {
        current += step[i + 1];
        i++;
      }
      quoted = true;
      continue;
    }
    if (quote !== null) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      quoted = true;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current !== '' || quoted) out.push(current);
      current = '';
      quoted = false;
      continue;
    }
    current += ch;
  }
  if (current !== '' || quoted) out.push(current);
  return out;
}

/** Skip `VAR=value` prefixes and an optional `sudo`, returning the command's index. */
function commandStart(tokens: string[]): number {
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  if (tokens[i] === 'sudo' || tokens[i] === 'env') i++;
  return i;
}

/**
 * If this shell step IS an `apk add` / `apk del` command, its package
 * arguments (version constraints stripped); otherwise null.
 *
 * Returning null for "this step is not that command" is the whole point: a
 * package name that merely appears in some other command's arguments — an
 * `echo`, a `label`, a `mv` — can never reach the installed set.
 */
function apkPackages(step: string, verb: 'add' | 'del'): string[] | null {
  const tokens = shellTokens(step);
  let i = commandStart(tokens);
  if (tokens[i] !== 'apk') return null;
  i++;
  while (i < tokens.length && tokens[i].startsWith('-')) i++; // `apk --no-cache add`
  if (tokens[i] !== verb) return null;
  i++;
  const packages: string[] = [];
  for (; i < tokens.length; i++) {
    if (tokens[i].startsWith('-')) continue;
    const name = tokens[i].split(/[=<>~]/)[0];
    if (name !== '') packages.push(name);
  }
  return packages;
}

/** Does this shell step RUN `npm ci` (as opposed to merely naming it)? */
function isNpmCiStep(step: string): boolean {
  const tokens = shellTokens(step);
  const i = commandStart(tokens);
  if (tokens[i] !== 'npm') return false;
  for (let j = i + 1; j < tokens.length; j++) {
    if (tokens[j].startsWith('-')) continue;
    return tokens[j] === 'ci';
  }
  return false;
}

/** Does this logical instruction run `npm ci` in any of its shell steps? */
function isNpmCiRun(instruction: string): boolean {
  if (!/^RUN\b/i.test(instruction)) return false;
  return splitShellSteps(runBody(instruction)).some(isNpmCiStep);
}

/** Strip `RUN`, its flags and any heredoc opener, leaving the shell body. */
function runBody(instruction: string): string {
  return instruction
    .replace(/^RUN\s*/i, '')
    .replace(/^(?:--\S+\s+)*/, '')
    .replace(/^<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?\s*/, '');
}

/** `NAME=value` pairs out of an `ARG`/`ENV` instruction's remainder. */
function parseAssignments(rest: string): [string, string][] {
  const out: [string, string][] = [];
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)=(?:"([^"]*)"|'([^']*)'|(\S*))/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rest)) !== null) {
    out.push([match[1], match[2] ?? match[3] ?? match[4] ?? '']);
  }
  return out;
}

/** Substitute `$NAME` / `${NAME}` from the known build args. Unknown names stay literal. */
function expandVars(text: string, vars: Map<string, string>): string {
  return text.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (whole, braced: string | undefined, bare: string | undefined) =>
      vars.get(braced ?? bare ?? '') ?? whole,
  );
}

/**
 * A stage's shell steps in execution order, with `ARG`/`ENV` values expanded.
 * Only `RUN` contributes steps — nothing else executes a command.
 */
function stageShellSteps(stage: Stage): string[] {
  const vars = new Map<string, string>();
  for (const declaration of stage.globalArgs) {
    for (const [name, value] of parseAssignments(declaration.replace(/^ARG\s*/i, ''))) {
      vars.set(name, value);
    }
  }
  const steps: string[] = [];
  for (const instruction of stage.instructions) {
    const declaration = /^(?:ARG|ENV)\s+([\s\S]*)$/i.exec(instruction);
    if (declaration) {
      for (const [name, value] of parseAssignments(declaration[1])) vars.set(name, value);
      continue;
    }
    if (!/^RUN\b/i.test(instruction)) continue;
    steps.push(...splitShellSteps(expandVars(runBody(instruction), vars)));
  }
  return steps;
}

/**
 * Follow `FROM <stage> AS <name>` aliases to the real base image.
 *
 * Round-2 review item 3: `libcFamily()` maps any base without `alpine` in it
 * to glibc, so `FROM deps AS builder` — a stage inheriting from an alpine
 * stage — was reported as a musl/glibc split that does not exist.
 */
function resolveBaseImage(stage: Stage, stages: readonly Stage[]): string {
  const seen = new Set<string>();
  let base = stage.base;
  while (!seen.has(base.toLowerCase())) {
    seen.add(base.toLowerCase());
    const parent = stages.find((candidate) => candidate.name.toLowerCase() === base.toLowerCase());
    if (!parent) return base;
    base = parent.base;
  }
  return base;
}

/** The stage this one inherits its filesystem from, if it is a `FROM <stage>`. */
function parentStage(stage: Stage, stages: readonly Stage[]): Stage | null {
  return (
    stages.find((candidate) => candidate.name.toLowerCase() === stage.base.toLowerCase()) ?? null
  );
}

/**
 * The libc family a base image implies. `node:24-alpine` is musl; the Debian
 * variants (`node:24`, `-slim`, `-bookworm`) are glibc. A native `.node` built
 * for one cannot be loaded by the other, and the runner stage copies
 * node_modules wholesale out of `builder`, so a stage that disagrees with the
 * others breaks at require() time rather than at build time. Callers must pass
 * a RESOLVED base (see resolveBaseImage) — a stage alias is not an image.
 */
function libcFamily(base: string): 'musl' | 'glibc' {
  return /alpine/i.test(base) ? 'musl' : 'glibc';
}

/** What a stage's shell steps do to the toolchain, in execution order. */
interface StageToolchain {
  /** Packages net-installed when the stage finishes (inherited ones included). */
  installedAtEnd: Set<string>;
  /** Packages present at the moment the stage's first `npm ci` runs. */
  installedAtNpmCi: Set<string> | null;
  /** Packages first `apk add`ed only AFTER `npm ci` had already run. */
  addedAfterNpmCi: Set<string>;
  /** Packages that were present at some point before `npm ci`, then removed. */
  removedBeforeNpmCi: Set<string>;
}

/**
 * Replay a stage's shell steps over an inherited package set.
 *
 * `inherited` is the parent stage's end state when this stage is a
 * `FROM <stage>` — real Docker semantics, and the reason `FROM deps AS
 * builder` running `npm ci` is legitimate: it already has deps' toolchain.
 */
function stageToolchain(stage: Stage, inherited: ReadonlySet<string>): StageToolchain {
  const installed = new Set(inherited);
  const everInstalledBeforeNpmCi = new Set(inherited);
  const addedAfterNpmCi = new Set<string>();
  const removedBeforeNpmCi = new Set<string>();
  let installedAtNpmCi: Set<string> | null = null;

  for (const step of stageShellSteps(stage)) {
    if (installedAtNpmCi === null && isNpmCiStep(step)) {
      installedAtNpmCi = new Set(installed);
      continue;
    }
    const added = apkPackages(step, 'add');
    if (added !== null) {
      for (const pkg of added) {
        installed.add(pkg);
        if (installedAtNpmCi === null) everInstalledBeforeNpmCi.add(pkg);
        else addedAfterNpmCi.add(pkg);
      }
      continue;
    }
    const deleted = apkPackages(step, 'del');
    if (deleted !== null) {
      for (const pkg of deleted) {
        if (installed.delete(pkg) && installedAtNpmCi === null) removedBeforeNpmCi.add(pkg);
      }
    }
  }

  return { installedAtEnd: installed, installedAtNpmCi, addedAfterNpmCi, removedBeforeNpmCi };
}

/** Replay every stage in file order, threading `FROM <stage>` inheritance through. */
function analyzeStages(stages: readonly Stage[]): Map<Stage, StageToolchain> {
  const byStage = new Map<Stage, StageToolchain>();
  for (const stage of stages) {
    const parent = parentStage(stage, stages);
    const inherited = parent ? (byStage.get(parent)?.installedAtEnd ?? new Set<string>()) : new Set<string>();
    byStage.set(stage, stageToolchain(stage, inherited));
  }
  return byStage;
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

  const analysis = analyzeStages(stages);
  const compilingStages = stages.filter((stage) => analysis.get(stage)!.installedAtNpmCi !== null);
  if (compilingStages.length === 0) {
    findings.push('no stage runs `npm ci`; this guard no longer knows what it is guarding');
    return findings;
  }

  for (const stage of compilingStages) {
    const state = analysis.get(stage)!;
    for (const pkg of REQUIRED_TOOLCHAIN) {
      if (state.installedAtNpmCi!.has(pkg)) continue;
      if (state.addedAfterNpmCi.has(pkg)) {
        findings.push(
          `stage "${stage.name}" installs ${pkg} AFTER \`npm ci\`, which is too late`,
        );
      } else if (state.removedBeforeNpmCi.has(pkg)) {
        findings.push(
          `stage "${stage.name}" installs ${pkg} and then removes it (\`apk del\`) before \`npm ci\` runs`,
        );
      } else {
        findings.push(
          `stage "${stage.name}" runs \`npm ci\` without installing ${pkg} ` +
            '(run 34794216577 failed exactly this way)',
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
    const analysis = analyzeStages(stages);
    const runner = stages[stages.length - 1];
    assert.ok(
      !runner.instructions.some(isNpmCiRun),
      `final stage "${runner.name}" runs \`npm ci\`; the runner is supposed to copy node_modules`,
    );
    // Net-installed at the END of the stage: `apk add x && apk del x` genuinely
    // does not ship x, and an inherited `FROM <toolchain stage>` genuinely does.
    const shipped = analysis.get(runner)!.installedAtEnd;
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(
        !shipped.has(pkg),
        `final stage "${runner.name}" ships ${pkg}; the build toolchain must not ship in the image`,
      );
    }
  });

  it('keeps every stage on the same libc, so the native binary that is installed is the one that loads', () => {
    const stages = parseStages(dockerfile);
    const families = new Set(stages.map((stage) => libcFamily(resolveBaseImage(stage, stages))));
    assert.equal(
      families.size,
      1,
      'stages disagree about libc: ' +
        stages
          .map((stage) => {
            const resolved = resolveBaseImage(stage, stages);
            return `${stage.name}=${resolved} (${libcFamily(resolved)})`;
          })
          .join(', ') +
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

  // ---------------------------------------------------------------------
  // Round-2 review, items 1 and 2. Each of the next three inputs passed the
  // round-1 guard 11/11 while producing an image that CANNOT build. They are
  // pinned here so the defeat can never be re-introduced by a later rewrite
  // of the parser.
  // ---------------------------------------------------------------------

  it('is not satisfied by a package name inside another command\'s arguments (review item 1)', () => {
    // Measured on the real Dockerfile before the fix: 11 pass / 0 fail. This
    // is what a leftover note looks like after exactly the "someone trimming
    // an image-size layer" edit this file exists to stop — `apk add` is
    // present, all three package names are present, and none of them is
    // being installed.
    const proseOnly = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache curl && echo "dropped: python3 make g++ (no longer needed)"\nCOPY package*.json ./',
    );
    const findings = toolchainFindings(proseOnly);
    assert.equal(
      findings.length,
      REQUIRED_TOOLCHAIN.length,
      `an echo string must not count as an install, got: ${JSON.stringify(findings)}`,
    );
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(findings.some((finding) => finding.includes(`installing ${pkg}`)));
    }
  });

  it('fires when the toolchain is `apk del`-ed again before `npm ci` (review item 1)', () => {
    // The standard alpine slimming idiom written slightly wrong — the del
    // belongs AFTER the build, not before it. Round-1 guard: 11 pass / 0 fail.
    const addedThenRemoved = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache python3 make g++ && apk del python3 make g++\nCOPY package*.json ./',
    );
    const findings = toolchainFindings(addedThenRemoved);
    assert.equal(findings.length, REQUIRED_TOOLCHAIN.length, JSON.stringify(findings));
    assert.ok(
      findings.every((finding) => finding.includes('removes it')),
      `expected every finding to name the removal, got: ${JSON.stringify(findings)}`,
    );
  });

  it('fires when `apk add` follows `npm ci` inside ONE `RUN` instruction (review item 2)', () => {
    // Round-1 compared INDICES into stage.instructions, so two commands joined
    // by `&&` inside one RUN compared equal and the "too late" branch could
    // never fire. Round-1 guard on this input: 11 pass / 0 fail, while
    // node-gyp runs before the toolchain it needs exists.
    const sameInstruction = PRE_FIX_DEPS_STAGE.replace(
      'RUN npm ci',
      'RUN npm ci && apk add --no-cache python3 make g++',
    );
    const findings = toolchainFindings(sameInstruction);
    assert.equal(findings.length, REQUIRED_TOOLCHAIN.length, JSON.stringify(findings));
    assert.ok(
      findings.every((finding) => finding.includes('too late')),
      `expected every finding to say "too late", got: ${JSON.stringify(findings)}`,
    );
  });

  // ---------------------------------------------------------------------
  // Round-3 review, items R2-1 and R2-2. Both passed the round-2 guard 21/21
  // while producing an image that CANNOT build, and both are the same parser
  // bug class as items 1 and 2: the splitter did not know where a shell
  // command actually ends. Shell behaviour verified in the base image shipped
  // at the time (`docker run --rm node:22-alpine sh -c …`) and again on
  // node:24-alpine, not argued from the spec.
  // ---------------------------------------------------------------------

  it('is not satisfied by an `apk add` hidden behind a shell `#` comment (review item R2-1)', () => {
    // `#` at a word boundary comments out the rest of the line, so the `&&`
    // and the whole second command are dead text. Commenting out the TAIL of
    // the RUN line is the same edit this file's header calls "the cheaper and
    // likelier edit", one character shorter — and round 2 did not survive it.
    const commentedTail = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache curl #&& apk add --no-cache python3 make g++\nCOPY package*.json ./',
    );
    const findings = toolchainFindings(commentedTail);
    assert.equal(
      findings.length,
      REQUIRED_TOOLCHAIN.length,
      `a shell-commented tail must not count as an install, got: ${JSON.stringify(findings)}`,
    );
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(findings.some((finding) => finding.includes(`installing ${pkg}`)));
    }
  });

  it('still treats a `#` that is NOT at a word boundary as an ordinary character', () => {
    // The negative direction of R2-1, so the fix cannot be over-applied:
    // `docker run --rm node:22-alpine sh -c 'echo a#b'` prints `a#b`.
    // An `apk add` whose arguments contain a `#` mid-word must still install.
    assert.deepEqual(splitShellSteps('echo a#b && apk add --no-cache python3'), [
      'echo a#b',
      'apk add --no-cache python3',
    ]);
    const midWord = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache --virtual .build-deps#1 python3 make g++\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(midWord), []);
  });

  it('is not satisfied by an `apk add` smuggled past a backslash-escaped quote (review item R2-2)', () => {
    // The shell sees ONE echo argument: `x " && apk add --no-cache python3
    // make g++`. Round 2 read the `\"` as a closing quote and invented a
    // phantom `apk add` step.
    const escapedQuote = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache curl && echo "x \\" && apk add --no-cache python3 make g++"\nCOPY package*.json ./',
    );
    const findings = toolchainFindings(escapedQuote);
    assert.equal(
      findings.length,
      REQUIRED_TOOLCHAIN.length,
      `an escaped quote must not end the string, got: ${JSON.stringify(findings)}`,
    );
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(findings.some((finding) => finding.includes(`installing ${pkg}`)));
    }
  });

  it('keeps a backslash-escaped character inside the token it belongs to', () => {
    // The negative direction of R2-2. `\ ` is an escaped space, so this is one
    // argument, not two — and an escaped `&` is not a command separator.
    assert.deepEqual(splitShellSteps('echo a\\&\\&b && apk add --no-cache make'), [
      'echo a\\&\\&b',
      'apk add --no-cache make',
    ]);
    assert.deepEqual(shellTokens('apk add --no-cache my\\ pkg'), [
      'apk',
      'add',
      '--no-cache',
      'my pkg',
    ]);
    // A backslash inside SINGLE quotes is literal, as the shell has it.
    assert.deepEqual(shellTokens("echo 'a\\b'"), ['echo', 'a\\b']);
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
    const stages = parseStages(mixed);
    const families = new Set(stages.map((stage) => libcFamily(resolveBaseImage(stage, stages))));
    assert.equal(families.size, 2, 'a glibc builder feeding a musl runner must read as a split');
  });

  it('joins backslash continuations, so a wrapped apk line still counts', () => {
    const wrapped = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache \\\n    python3 \\\n    make \\\n    g++\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(wrapped), []);
  });

  it('a trailing stage that re-installs the toolchain still fails the runner check', () => {
    // Trailing-stage smuggling: append a stage after the runner and the
    // toolchain ships after all. The runner check reads the LAST stage, so
    // this must stay red.
    const smuggled = [
      'FROM node:22-alpine AS deps',
      'RUN apk add --no-cache python3 make g++',
      'RUN npm ci',
      '',
      'FROM node:22-alpine AS runner',
      'CMD ["npx", "tsx", "server.ts"]',
      '',
      'FROM node:22-alpine AS extra',
      'RUN apk add --no-cache python3 make g++',
    ].join('\n');
    const stages = parseStages(smuggled);
    const analysis = analyzeStages(stages);
    const last = stages[stages.length - 1];
    assert.equal(last.name, 'extra');
    for (const pkg of REQUIRED_TOOLCHAIN) {
      assert.ok(
        analysis.get(last)!.installedAtEnd.has(pkg),
        `the runner check must see ${pkg} shipping in the trailing stage`,
      );
    }
  });

  // ---------------------------------------------------------------------
  // Round-2 review, item 3. Four shapes that BUILD CORRECTLY and which the
  // round-1 parser reported as broken. Failing closed is the right direction
  // for a guard, but each of these is ordinary enough that a real edit would
  // hit it, and a guard that cries wolf gets deleted.
  // ---------------------------------------------------------------------

  it('accepts an ARG-parameterised package list (review item 3)', () => {
    const parameterised = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'ARG TOOLCHAIN="python3 make g++"\nRUN apk add --no-cache $TOOLCHAIN\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(parameterised), []);
  });

  it('accepts a global ARG (declared before the first FROM) as the package list', () => {
    const globalArg = `ARG TOOLCHAIN="python3 make g++"\n${PRE_FIX_DEPS_STAGE}`.replace(
      'COPY package*.json ./',
      'RUN apk add --no-cache ${TOOLCHAIN}\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(globalArg), []);
  });

  it('accepts a `RUN <<EOF` heredoc that installs the toolchain (review item 3)', () => {
    const heredoc = PRE_FIX_DEPS_STAGE.replace(
      'COPY package*.json ./',
      'RUN <<EOF\napk add --no-cache python3 make g++\nEOF\nCOPY package*.json ./',
    );
    assert.deepEqual(toolchainFindings(heredoc), []);
  });

  it('resolves `FROM <stage> AS <name>` to the aliased stage, for libc AND for inherited packages (review item 3)', () => {
    const inherited = [
      'FROM node:22-alpine AS deps',
      'RUN apk add --no-cache python3 make g++',
      '',
      'FROM deps AS builder',
      'WORKDIR /app',
      'RUN npm ci',
      '',
      'FROM node:22-alpine AS runner',
      'CMD ["npx", "tsx", "server.ts"]',
    ].join('\n');
    // The toolchain is inherited from `deps`, so `npm ci` in `builder` is fine.
    assert.deepEqual(toolchainFindings(inherited), []);
    // And `builder` is musl, not the glibc a raw string match would infer.
    const stages = parseStages(inherited);
    assert.equal(resolveBaseImage(stages[1], stages), 'node:22-alpine');
    assert.equal(new Set(stages.map((s) => libcFamily(resolveBaseImage(s, stages)))).size, 1);
  });

  it('accepts `FROM --platform=… <image> AS <name>` (review item 3)', () => {
    const platformed = PRE_FIX_DEPS_STAGE.replace(
      'FROM node:22-alpine AS deps',
      'FROM --platform=$BUILDPLATFORM node:22-alpine AS deps',
    ).replace('COPY package*.json ./', 'RUN apk add --no-cache python3 make g++\nCOPY package*.json ./');
    const stages = parseStages(platformed);
    assert.equal(stages.length, 2, 'a FROM carrying a flag must not drop the stage');
    assert.equal(stages[0].name, 'deps');
    assert.equal(stages[0].base, 'node:22-alpine');
    assert.deepEqual(toolchainFindings(platformed), []);
  });

  it('still reads a stage alias that itself inherits, transitively', () => {
    const chained = [
      'FROM node:22-alpine AS base',
      'RUN apk add --no-cache python3 make g++',
      'FROM base AS deps',
      'FROM deps AS builder',
      'RUN npm ci',
    ].join('\n');
    const stages = parseStages(chained);
    assert.equal(resolveBaseImage(stages[2], stages), 'node:22-alpine');
    assert.deepEqual(toolchainFindings(chained), []);
  });
});
