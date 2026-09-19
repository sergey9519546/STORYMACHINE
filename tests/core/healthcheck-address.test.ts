// Container healthchecks must probe an address the server actually serves.
//
// WHY THIS EXISTS (measured 2026-09-18, Docker Desktop, engine 29.2.1, on the
// node:22-alpine image built from main@8b6a60c1 and on a node:24-alpine
// build): the Dockerfile HEALTHCHECK reported `unhealthy` on every probe while
// the server was up and `GET /ready` answered 200 from the host. The health
// log was five consecutive
//     exit=1 out="wget: can't connect to remote host: Connection refused"
// Inside the running container:
//   - server.ts binds `app.listen(PORT, '0.0.0.0', …)` — IPv4 only;
//     `netstat -tln` shows nothing but 0.0.0.0:3000.
//   - /etc/hosts carries `127.0.0.1 localhost` AND `::1 localhost`.
//   - busybox wget resolves `localhost` to ::1 and does not fall back:
//       wget -qO- http://localhost:3000/ready   -> Connection refused (exit 1)
//       wget -qO- http://127.0.0.1:3000/ready   -> {"ready":true}     (exit 0)
//       wget -qO- http://[::1]:3000/ready       -> Connection refused (exit 1)
// docker-compose.yml's healthcheck probed the same URL. The Edge Image lane
// (docs/audits/2026-09-18-edge-image/README.md) saw `healthy` on its own
// sandbox, whose Docker evidently did not write `::1 localhost` into the
// container — so the probe was right or wrong depending on the Docker HOST,
// which is the worst kind of wrong: it passes where it was checked.
//
// The fix probes 127.0.0.1, the address a 0.0.0.0 bind serves on every host.
// It does not bind dual-stack instead: that would newly expose the server on
// IPv6 everywhere and change the form of every IPv4 client address
// (`::ffff:a.b.c.d`) that rate limiting, logging and the loopback-only admin
// routes read. See docs/audits/2026-09-18-healthcheck-ipv4/README.md.
//
// WHAT THIS CHECKS. The probe's ADDRESS is derived from the server, not
// hard-coded here: the listen host and PORT default are read out of
// server.ts's live `app.listen(PORT, '<host>', …)` call through the
// TypeScript AST (comments are not AST nodes, so a commented-out call cannot
// count), and each probe URL's host must be one that listen host serves on
// every Docker host, and its port must be the one the server listens on in
// that deployment. A future dual-stack bind makes `localhost` acceptable
// again without editing this file; a future bind to ::1 makes 127.0.0.1 an
// error. It is the agreement that is guarded, not a particular string.
//
// The port half is what found the second defect in the same probe
// (docker-compose.yml): compose set the container's PORT to `${PORT:-3000}`
// while its healthcheck and its port mapping both targeted a fixed 3000, so
// any PORT other than 3000 moved the server away from both.
//
// Comment lines are stripped before anything is read, for the reason
// tests/core/dockerfile-toolchain.test.ts's header gives: the live files'
// prose quotes the very URLs checked here, and a guard that read comments
// would stay green after the live line changed. The Dockerfile is read with
// that file's own parser (tests/helpers/dockerfile.ts), not a second copy.
//
// WHERE IT FAILS CLOSED: a listen host that is not a string literal, a PORT
// that is not `Number(process.env.PORT ?? <literal>)` or a literal, a probe
// with no http(s) URL in it, a compose `test:` in a shape this reader does
// not parse (single-quoted flow sequences, anchors), and a probe host that is
// a name other than `localhost` all read as findings, not as passes.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { parseStages } from '../helpers/dockerfile.ts';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file: string): string => fs.readFileSync(path.join(root, file), 'utf8');

interface ListenTarget {
  /** The literal host argument of `app.listen(PORT, host, …)`. */
  host: string;
  /** PORT's default when the environment variable is unset. */
  defaultPort: number;
  /** The environment variable that overrides the port, if the port is env-driven. */
  envVar: string | null;
}

/**
 * Read the listen host and port out of server.ts's live `app.listen(...)`
 * call. Throws — the guard fails closed — on anything it cannot read as a
 * literal.
 */
function serverListenTarget(source: string): ListenTarget {
  const file = ts.createSourceFile('server.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const listens: ts.CallExpression[] = [];
  const initializers = new Map<string, ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'listen'
      && ts.isIdentifier(node.expression.expression)
      && node.expression.expression.text === 'app'
    ) {
      listens.push(node);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      initializers.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (listens.length !== 1) {
    throw new Error(`expected exactly one live app.listen(...) call in server.ts, found ${listens.length}`);
  }
  const [portArg, hostArg] = listens[0].arguments;
  if (!hostArg || !ts.isStringLiteral(hostArg)) {
    throw new Error(
      'app.listen(...) has no string-literal host argument, so which addresses it serves depends on the '
      + 'platform (Node binds :: when IPv6 is available and 0.0.0.0 otherwise) — this guard cannot decide it statically',
    );
  }

  let portExpr: ts.Expression | undefined = portArg;
  if (portExpr && ts.isIdentifier(portExpr)) portExpr = initializers.get(portExpr.text);
  if (portExpr && ts.isNumericLiteral(portExpr)) {
    return { host: hostArg.text, defaultPort: Number(portExpr.text), envVar: null };
  }
  // Number(process.env.X ?? <literal>)
  if (
    portExpr
    && ts.isCallExpression(portExpr)
    && ts.isIdentifier(portExpr.expression)
    && portExpr.expression.text === 'Number'
    && portExpr.arguments.length === 1
  ) {
    const inner = portExpr.arguments[0];
    if (
      ts.isBinaryExpression(inner)
      && inner.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      && ts.isNumericLiteral(inner.right)
      && ts.isPropertyAccessExpression(inner.left)
      && inner.left.expression.getText(file) === 'process.env'
    ) {
      return { host: hostArg.text, defaultPort: Number(inner.right.text), envVar: inner.left.name.text };
    }
  }
  throw new Error(
    `cannot read app.listen(...)'s port (${portArg ? portArg.getText(file) : 'missing'}) as a literal or as `
    + 'Number(process.env.X ?? <literal>)',
  );
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Whether a probe host inside the container reaches a server bound to
 * `listenHost`, on EVERY Docker host. Returns null when it does, or the reason
 * it does not.
 */
function unservedReason(listenHost: string, probeHost: string): string | null {
  const host = probeHost.replace(/^\[(.*)\]$/, '$1');
  const v4 = IPV4.exec(host);
  const isV4Loopback = v4 !== null && v4[1] === '127';
  const isV6Loopback = host === '::1';

  if (listenHost === '0.0.0.0') {
    if (isV4Loopback) return null;
    if (v4) return `${host} is not a loopback address — the probe runs INSIDE the container, and only 127.0.0.0/8 is guaranteed to reach a 0.0.0.0 bind there`;
    if (host.includes(':')) return `the server binds ${listenHost} (IPv4 only), so nothing listens on [${host}]`;
    return (
      `"${host}" is a name, resolved inside the container: Docker Desktop 29.2.1 writes \`::1 localhost\` into `
      + '/etc/hosts, busybox wget takes ::1 and does not fall back, and a 0.0.0.0 bind serves IPv4 only — '
      + 'measured: every probe "Connection refused", container unhealthy. Probe 127.0.0.1'
    );
  }
  if (listenHost === '::') {
    // Dual-stack: Node listens with IPV6_V6ONLY off, so IPv4 arrives mapped.
    if (isV4Loopback || isV6Loopback || host === 'localhost') return null;
    return `"${host}" is not a loopback address or \`localhost\`; only those are guaranteed to reach a :: bind from inside the container`;
  }
  if (host === listenHost) return null;
  return `the server binds only ${listenHost}, and the probe targets ${host}`;
}

interface Probe {
  url: string;
  host: string;
  /** The port text as written — a number, or an interpolation such as `${PORT:-3000}`; null when absent. */
  port: string | null;
}

function probesIn(command: string): Probe[] {
  const out: Probe[] = [];
  for (const m of command.matchAll(/\bhttps?:\/\/(\[[^\]\s]*\]|[^\s/:'"[\]]+)(?::([^\s/'"]+))?/g)) {
    out.push({ url: m[0], host: m[1], port: m[2] ?? null });
  }
  return out;
}

function portsAgree(probePort: string | null, servedPort: string): boolean {
  if (probePort === null) return false; // http:// with no port means 80
  if (/^\d+$/.test(probePort) && /^\d+$/.test(servedPort)) return Number(probePort) === Number(servedPort);
  // The same interpolation on both sides (compose resolves both from one
  // environment at config time) is the same port. Anything else is not
  // decidable here and reads as a disagreement.
  return probePort === servedPort;
}

function probeFindings(where: string, command: string, listen: ListenTarget, servedPort: string, portSource: string): string[] {
  const probes = probesIn(command);
  if (probes.length === 0) {
    return [`${where}: no http(s) URL in the probe command \`${command}\`, so what it probes cannot be checked`];
  }
  const findings: string[] = [];
  for (const probe of probes) {
    const hostProblem = unservedReason(listen.host, probe.host);
    if (hostProblem) findings.push(`${where}: ${probe.url} — ${hostProblem}`);
    if (!portsAgree(probe.port, servedPort)) {
      findings.push(
        `${where}: ${probe.url} probes port ${probe.port ?? '80 (none given)'}, but the server listens on ${servedPort} there (${portSource})`,
      );
    }
  }
  return findings;
}

/** `ENV KEY=value …` or `ENV KEY value` in the given live instructions; the last assignment wins. */
function dockerEnv(instructions: readonly string[], key: string): string | null {
  let value: string | null = null;
  for (const instruction of instructions) {
    const env = /^ENV\s+(.*)$/i.exec(instruction);
    if (!env) continue;
    const rest = env[1].trim();
    const legacy = /^([A-Za-z_][A-Za-z0-9_]*)\s+(.*)$/.exec(rest);
    if (legacy && !rest.includes('=')) {
      if (legacy[1] === key) value = legacy[2].trim();
      continue;
    }
    for (const m of rest.matchAll(/([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|'[^']*'|\S*)/g)) {
      if (m[1] === key) value = m[2].replace(/^(["'])(.*)\1$/, '$2');
    }
  }
  return value;
}

function dockerfileFindings(dockerfile: string, listen: ListenTarget): string[] {
  const stages = parseStages(dockerfile);
  if (stages.length === 0) return ['Dockerfile: no stages parsed'];
  const final = stages[stages.length - 1];
  const healthchecks = final.instructions.filter((i) => /^HEALTHCHECK\b/i.test(i));
  if (healthchecks.length === 0) {
    return [`Dockerfile: the final stage "${final.name}" has no live HEALTHCHECK, so the shipped image reports no health at all`];
  }
  // Docker applies the LAST HEALTHCHECK instruction of the image.
  const last = healthchecks[healthchecks.length - 1];
  if (/^HEALTHCHECK\s+NONE\b/i.test(last)) {
    return ['Dockerfile: the live HEALTHCHECK is `NONE`, which disables the check'];
  }
  const cmd = /\bCMD\b\s*(.*)$/is.exec(last);
  if (!cmd) return [`Dockerfile: cannot find CMD in \`${last}\``];

  const envPort = listen.envVar ? dockerEnv(final.instructions, listen.envVar) : null;
  const served = envPort ?? String(listen.defaultPort);
  const portSource = envPort
    ? `the final stage sets ENV ${listen.envVar}=${envPort}`
    : `server.ts's default, ${listen.envVar ? `with ${listen.envVar} unset in the image` : 'a literal'}`;
  return probeFindings('Dockerfile HEALTHCHECK', cmd[1], listen, served, portSource);
}

/** Drop a YAML trailing comment (` #…` outside quotes). */
function stripYamlComment(value: string): string {
  let quote: string | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '#' && (i === 0 || /\s/.test(value[i - 1]))) return value.slice(0, i).trimEnd();
  }
  return value.trimEnd();
}

function unquote(value: string): string {
  return value.trim().replace(/^(["'])(.*)\1$/, '$2');
}

const indentOf = (line: string): number => line.length - line.trimStart().length;

/** The live lines of the block opened by `key:` at `index`, i.e. everything indented deeper than it. */
function blockAfter(lines: readonly string[], index: number): string[] {
  const own = indentOf(lines[index]);
  const out: string[] = [];
  for (let i = index + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (indentOf(lines[i]) <= own) break;
    out.push(lines[i]);
  }
  return out;
}

interface ComposeReading {
  /** Each healthcheck's probe command, or the reason it could not be read. */
  checks: ({ command: string } | { problem: string })[];
  /** The live `environment:` value of `envVar`, if compose sets it. */
  envPort: string | null;
}

function readCompose(source: string, envVar: string | null): ComposeReading {
  const lines = source.split(/\r?\n/).filter((line) => !/^\s*#/.test(line));
  const checks: ComposeReading['checks'] = [];
  let envPort: string | null = null;

  lines.forEach((line, index) => {
    if (/^\s*healthcheck:\s*$/.test(line)) {
      const block = blockAfter(lines, index);
      if (block.some((l) => /^\s*disable:\s*true\b/.test(l))) {
        checks.push({ problem: 'the healthcheck is `disable: true`' });
        return;
      }
      const at = block.findIndex((l) => /^\s*test:/.test(l));
      if (at === -1) {
        checks.push({ problem: 'the healthcheck block has no `test:`' });
        return;
      }
      const raw = stripYamlComment(block[at].replace(/^\s*test:\s*/, ''));
      let parts: string[];
      if (raw.startsWith('[')) {
        try {
          parts = JSON.parse(raw) as string[];
        } catch {
          checks.push({ problem: `cannot read the flow sequence \`${raw}\` (only double-quoted items are parsed)` });
          return;
        }
      } else if (raw === '') {
        parts = blockAfter(block, at)
          .map((l) => /^\s*-\s+(.*)$/.exec(l)?.[1])
          .filter((v): v is string => v !== undefined)
          .map((v) => unquote(stripYamlComment(v)));
      } else {
        parts = ['CMD-SHELL', unquote(raw)];
      }
      if (parts[0] === 'NONE') checks.push({ problem: 'the healthcheck test is NONE' });
      else if (parts[0] === 'CMD') checks.push({ command: parts.slice(1).join(' ') });
      else if (parts[0] === 'CMD-SHELL') checks.push({ command: parts.slice(1).join(' ') });
      else checks.push({ problem: `unrecognised healthcheck test form \`${raw}\`` });
    }
    if (envVar && /^\s*environment:\s*$/.test(line)) {
      for (const l of blockAfter(lines, index)) {
        const mapping = new RegExp(`^\\s*${envVar}:\\s*(.*)$`).exec(l);
        const list = new RegExp(`^\\s*-\\s*["']?${envVar}=(.*?)["']?\\s*$`).exec(l);
        if (mapping) envPort = unquote(stripYamlComment(mapping[1]));
        else if (list) envPort = list[1].trim();
      }
    }
  });
  return { checks, envPort };
}

function composeFindings(compose: string, listen: ListenTarget): string[] {
  const { checks, envPort } = readCompose(compose, listen.envVar);
  const served = envPort ?? String(listen.defaultPort);
  const portSource = envPort
    ? `compose sets ${listen.envVar}: ${envPort} in the service environment`
    : `server.ts's default, with ${listen.envVar ?? 'the port'} unset by compose`;
  const findings: string[] = [];
  for (const check of checks) {
    if ('problem' in check) findings.push(`docker-compose.yml healthcheck: ${check.problem}`);
    else findings.push(...probeFindings('docker-compose.yml healthcheck', check.command, listen, served, portSource));
  }
  return findings;
}

// ── The live files ───────────────────────────────────────────────────────────

const listen = serverListenTarget(read('server.ts'));

describe('container healthchecks probe an address the server actually serves', () => {
  it('server.ts binds a literal host and an env-driven port with a literal default (what the probes are checked against)', () => {
    // Not a pin on the values — a change here is fine, and the two checks
    // below follow it. This only proves the reader found the real call.
    assert.equal(typeof listen.host, 'string');
    assert.ok(Number.isInteger(listen.defaultPort) && listen.defaultPort > 0, `default port ${listen.defaultPort}`);
  });

  it('the Dockerfile HEALTHCHECK does', () => {
    assert.deepEqual(dockerfileFindings(read('Dockerfile'), listen), []);
  });

  it('the docker-compose.yml healthcheck does, and compose does not move the server off the port it probes', () => {
    const compose = read('docker-compose.yml');
    assert.ok(readCompose(compose, listen.envVar).checks.length > 0, 'docker-compose.yml no longer has a healthcheck to check');
    assert.deepEqual(composeFindings(compose, listen), []);
  });
});

// ── The unfixed input, and the shapes that must stay red ─────────────────────

const LISTEN_V4: ListenTarget = { host: '0.0.0.0', defaultPort: 3000, envVar: 'PORT' };

/** A minimal image whose runner stage ends in the given HEALTHCHECK lines. */
const image = (...healthcheck: string[]): string =>
  ['FROM node:24-alpine AS deps', 'RUN npm ci', '', 'FROM node:24-alpine AS runner', 'EXPOSE 3000', ...healthcheck, 'CMD ["npx", "tsx", "server.ts"]'].join('\n');

/** A minimal compose service with the given healthcheck and environment lines. */
const compose = (test: string[], environment: string[] = []): string =>
  [
    'services:',
    '  storymachine:',
    '    ports:',
    '      - "${PORT:-3000}:3000"',
    ...(environment.length ? ['    environment:', ...environment.map((l) => `      ${l}`)] : []),
    '    healthcheck:',
    ...test.map((l) => `      ${l}`),
    '      interval: 30s',
  ].join('\n');

// Verbatim from main@8b6a60c1.
const UNFIXED_DOCKERFILE_HEALTHCHECK = [
  'HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \\',
  '  CMD wget -qO- http://localhost:3000/ready || exit 1',
];
const UNFIXED_COMPOSE_TEST = 'test: ["CMD", "wget", "-qO-", "http://localhost:3000/ready"]';
const UNFIXED_COMPOSE_ENV = 'PORT: ${PORT:-3000}';

describe('healthcheck address guard — it fails on the input that was measured failing', () => {
  it('fires on the Dockerfile HEALTHCHECK exactly as main@8b6a60c1 shipped it', () => {
    const findings = dockerfileFindings(image(...UNFIXED_DOCKERFILE_HEALTHCHECK), LISTEN_V4);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0], /"localhost" is a name.*::1/);
  });

  it('fires on the compose healthcheck exactly as main@8b6a60c1 shipped it — host AND port', () => {
    const findings = composeFindings(compose([UNFIXED_COMPOSE_TEST], [UNFIXED_COMPOSE_ENV]), LISTEN_V4);
    assert.equal(findings.length, 2, JSON.stringify(findings));
    assert.match(findings[0], /"localhost" is a name/);
    assert.match(findings[1], /probes port 3000, but the server listens on \$\{PORT:-3000\}/);
  });

  it('does NOT fire on the fixed probes (no false positive)', () => {
    assert.deepEqual(
      dockerfileFindings(image('HEALTHCHECK --interval=30s CMD wget -qO- http://127.0.0.1:3000/ready || exit 1'), LISTEN_V4),
      [],
    );
    assert.deepEqual(
      composeFindings(compose(['test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/ready"]']), LISTEN_V4),
      [],
    );
  });

  it('is not satisfied by a COMMENTED-OUT correct probe above a live wrong one', () => {
    const shadowed = image('# HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready || exit 1', ...UNFIXED_DOCKERFILE_HEALTHCHECK);
    assert.equal(dockerfileFindings(shadowed, LISTEN_V4).length, 1);
    const composeShadowed = compose(['# test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/ready"]', UNFIXED_COMPOSE_TEST]);
    assert.equal(composeFindings(composeShadowed, LISTEN_V4).length, 1);
  });

  it('reads the LAST HEALTHCHECK, which is the one Docker applies', () => {
    const fixedThenBroken = image(
      'HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready || exit 1',
      'HEALTHCHECK CMD wget -qO- http://localhost:3000/ready || exit 1',
    );
    assert.equal(dockerfileFindings(fixedThenBroken, LISTEN_V4).length, 1);
    const brokenThenFixed = image(
      'HEALTHCHECK CMD wget -qO- http://localhost:3000/ready || exit 1',
      'HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready || exit 1',
    );
    assert.deepEqual(dockerfileFindings(brokenThenFixed, LISTEN_V4), []);
  });

  it('fires on the IPv6 loopback against an IPv4-only bind (measured: refused)', () => {
    const findings = dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://[::1]:3000/ready || exit 1'), LISTEN_V4);
    assert.equal(findings.length, 1);
    assert.match(findings[0], /IPv4 only/);
  });

  it('fires on a wrong port, a missing port, and a port the image moved with ENV', () => {
    assert.match(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ready'), LISTEN_V4)[0], /port 8080/);
    assert.match(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://127.0.0.1/ready'), LISTEN_V4)[0], /port 80 \(none given\)/);
    const moved = image('ENV PORT=8080', 'HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready');
    assert.match(dockerfileFindings(moved, LISTEN_V4)[0], /listens on 8080 there \(the final stage sets ENV PORT=8080\)/);
    assert.deepEqual(dockerfileFindings(image('ENV PORT=8080', 'HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/ready'), LISTEN_V4), []);
  });

  it('fires when there is no health check to run: missing, NONE, only in a non-final stage, no URL', () => {
    assert.match(dockerfileFindings(image(), LISTEN_V4)[0], /no live HEALTHCHECK/);
    assert.match(dockerfileFindings(image('HEALTHCHECK NONE'), LISTEN_V4)[0], /NONE/);
    const earlyStage = ['FROM node:24-alpine AS deps', 'HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready', 'FROM node:24-alpine AS runner', 'CMD ["node"]'].join('\n');
    assert.match(dockerfileFindings(earlyStage, LISTEN_V4)[0], /final stage "runner" has no live HEALTHCHECK/);
    assert.match(dockerfileFindings(image('HEALTHCHECK CMD /bin/true'), LISTEN_V4)[0], /no http\(s\) URL/);
    assert.match(composeFindings(compose(['test: ["NONE"]']), LISTEN_V4)[0], /NONE/);
    assert.match(composeFindings(compose(['disable: true']), LISTEN_V4)[0], /disable: true/);
  });

  it('fires on a non-loopback IPv4 and on any other host name, rather than guessing', () => {
    assert.match(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://10.0.0.5:3000/ready'), LISTEN_V4)[0], /not a loopback/);
    assert.match(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://storymachine:3000/ready'), LISTEN_V4)[0], /"storymachine" is a name/);
  });
});

describe('healthcheck address guard — it follows the server, it is not a ban on a string', () => {
  it('a dual-stack bind (::) serves localhost, 127.0.0.1 and ::1', () => {
    const dual: ListenTarget = { ...LISTEN_V4, host: '::' };
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      assert.deepEqual(dockerfileFindings(image(`HEALTHCHECK CMD wget -qO- http://${host}:3000/ready`), dual), [], host);
    }
  });

  it('a bind to one address serves only that address', () => {
    const v4only: ListenTarget = { ...LISTEN_V4, host: '127.0.0.1' };
    assert.deepEqual(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready'), v4only), []);
    assert.equal(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://127.0.0.2:3000/ready'), v4only).length, 1);
    const v6only: ListenTarget = { ...LISTEN_V4, host: '::1' };
    assert.equal(dockerfileFindings(image('HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/ready'), v6only).length, 1);
  });

  it('compose may follow PORT, as long as the probe follows the SAME expression', () => {
    const following = compose(['test: ["CMD", "wget", "-qO-", "http://127.0.0.1:${PORT:-3000}/ready"]'], [UNFIXED_COMPOSE_ENV]);
    assert.deepEqual(composeFindings(following, LISTEN_V4), []);
    const literal = compose(['test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/ready"]'], ['PORT: "3000"']);
    assert.deepEqual(composeFindings(literal, LISTEN_V4), []);
    const listForm = compose(['test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/ready"]'], ['- PORT=8080']);
    assert.match(composeFindings(listForm, LISTEN_V4)[0], /listens on 8080/);
  });

  it('reads compose `test:` as a CMD-SHELL string and as a block sequence', () => {
    assert.deepEqual(composeFindings(compose(['test: wget -qO- http://127.0.0.1:3000/ready || exit 1']), LISTEN_V4), []);
    assert.equal(composeFindings(compose(['test: ["CMD-SHELL", "wget -qO- http://localhost:3000/ready || exit 1"]']), LISTEN_V4).length, 1);
    const block = compose(['test:', '  - CMD', '  - wget', '  - -qO-', '  - "http://localhost:3000/ready"']);
    assert.equal(composeFindings(block, LISTEN_V4).length, 1);
  });

  it('reads server.ts through the AST: a commented-out listen call does not count, a non-literal host fails closed', () => {
    const src = [
      'const PORT = Number(process.env.PORT ?? 3000);',
      "// app.listen(PORT, '::', () => {});",
      "/* app.listen(PORT, '::1') */",
      "app.listen(PORT, '0.0.0.0', () => {});",
    ].join('\n');
    assert.deepEqual(serverListenTarget(src), { host: '0.0.0.0', defaultPort: 3000, envVar: 'PORT' });
    assert.throws(() => serverListenTarget("const HOST = '0.0.0.0'; app.listen(3000, HOST);"), /string-literal host/);
    assert.throws(() => serverListenTarget('app.listen(3000, () => {});'), /string-literal host/);
    assert.throws(() => serverListenTarget("app.listen(Number(process.env.PORT), '0.0.0.0');"), /cannot read app\.listen/);
    assert.deepEqual(serverListenTarget("app.listen(8080, '::');"), { host: '::', defaultPort: 8080, envVar: null });
  });
});
