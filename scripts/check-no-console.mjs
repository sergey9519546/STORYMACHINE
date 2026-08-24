#!/usr/bin/env node
// check-no-console.mjs — mechanical enforcement of CLAUDE.md's
// "no console.* under server/**; use server/lib/logger.ts".
//
// ---------------------------------------------------------------------------
// WHY THIS REPLACED THE INLINE `grep -rn 'console\.' server ...` STEP
// ---------------------------------------------------------------------------
// The gate used to live inline in ci.yml/release.yml as a recursive grep with
// a list of `--exclude=` flags naming the never-compiled v5.0 "narrative OS"
// experiment's dead files. GNU grep's `--exclude=GLOB`, when searching
// RECURSIVELY, matches the BASE NAME of each file — not its path. So
// `--exclude=index.ts` did not exempt "the dead kernel barrel"; it exempted
// EVERY file in the tree named index.ts, including:
//
//     server/routes/nvm/index.ts   <- the live route barrel mounted by app.ts
//     server/nvm/quality/index.ts  <- live
//     server/nvm/project/index.ts  <- live
//     server/nvm/bible/index.ts    <- live
//
// Verified before this script existed: appending `console.log("GATE PROBE")`
// to server/routes/nvm/index.ts and running the ci.yml step verbatim exited 0.
// The gate advertised coverage of the live server and did not have it.
//
// This is the SECOND time this exact class of bug was fixed here — the
// previous round removed `--exclude-dir=kernel`, which had been hiding the
// live event-store closure. Fixing it a third time by editing a flag list is
// not a fix, it is a rehearsal. So the exemption list is no longer written by
// hand at all:
//
//   1. THE EXEMPTION SET IS DERIVED FROM tsconfig.json's `exclude` array.
//      That array is already the repo's single, path-anchored, reviewed
//      declaration of "this code is quarantined and never compiled" (see its
//      QUARANTINE comment). Two lists cannot disagree if there is one list.
//
//   2. EVERY EXEMPTION IS PROVEN DEAD, NOT ASSERTED DEAD. Before checking a
//      single file, this script walks the static import graph out from the
//      real entrypoints (server.ts, server/app.ts) and fails if ANY exempted
//      path is reachable from the running server. Had that check existed,
//      `--exclude=index.ts` would have failed the build the day it was
//      written, because server/routes/nvm/index.ts is four edges from app.ts.
//
//   3. EVERY EXEMPTION MUST BE PATH-ANCHORED AND MUST EXIST. A bare basename
//      (`index.ts`) is rejected outright — it is the bug's signature. A stale
//      entry pointing at a deleted file is rejected too, because a list that
//      no longer matches reality is a list nobody is reading.
//
// Net effect: an exemption can only ever cover code that is genuinely not
// wired into the server, and the check that enforces that is not the same
// kind of artifact (a flag list) that failed twice.
//
// Exit 0 = clean. Exit 1 = a console.* under server/** on live code, or an
// exemption that cannot justify itself.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { computeReachableSet } from './lib/import-graph.mjs';

const ROOT = process.cwd();
const SCAN_DIR = 'server';
const LIVE_ENTRYPOINTS = ['server.ts', 'server/app.ts'];
const TSCONFIG = 'tsconfig.json';

// ---------------------------------------------------------------------------
// tsconfig.json parsing (it carries // comments, so JSON.parse alone fails)
// ---------------------------------------------------------------------------

/** Strip `//` line comments while respecting string literals. */
function stripJsonComments(src) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; continue; }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

function readTsconfigExcludes() {
  const abs = path.join(ROOT, TSCONFIG);
  const parsed = JSON.parse(stripJsonComments(readFileSync(abs, 'utf8')));
  const list = parsed.exclude;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${TSCONFIG} has no "exclude" array — the no-console exemption set is derived from it, and an empty one means the quarantine declaration moved somewhere this gate cannot see.`);
  }
  return list.map((s) => String(s).replace(/\\/g, '/'));
}

// ---------------------------------------------------------------------------
// Exemption matchers
// ---------------------------------------------------------------------------

/**
 * An exclusion entry becomes one of three matchers:
 *   - 'glob'  — starts with `**\/` (e.g. `**\/*.bench.ts`); matched against the
 *               path tail. `*` means "no slashes".
 *   - 'dir'   — resolves to a directory on disk; matches everything beneath it.
 *   - 'file'  — resolves to a file on disk; matches exactly that path.
 * Entries that touch nothing under server/ are carried but never consulted.
 */
function buildMatchers(excludes) {
  const matchers = [];
  const problems = [];
  for (const raw of excludes) {
    const entry = raw.replace(/^\.\//, '').replace(/\/+$/, '');
    if (entry.startsWith('**/')) {
      const tail = entry.slice(3);
      if (tail.includes('**')) {
        problems.push(`exclusion "${raw}" uses a nested \`**\` this gate does not model — express it as a directory or an explicit path.`);
        continue;
      }
      const re = new RegExp(`(^|/)${tail.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`);
      matchers.push({ raw, kind: 'glob', test: (p) => re.test(p) });
      continue;
    }
    const abs = path.join(ROOT, entry);
    const touchesServer = entry === SCAN_DIR || entry.startsWith(`${SCAN_DIR}/`);
    if (touchesServer && !entry.includes('/')) {
      // Unreachable in practice (`server` itself is the only single-segment
      // server-scoped entry) but stated explicitly so the rule is visible.
      problems.push(`exclusion "${raw}" is a bare name, not a path.`);
      continue;
    }
    if (!existsSync(abs)) {
      if (touchesServer) {
        problems.push(`exclusion "${raw}" does not exist on disk — a stale quarantine entry exempts nothing and hides the fact that nobody is maintaining the list.`);
      }
      continue;
    }
    if (statSync(abs).isDirectory()) {
      matchers.push({ raw, kind: 'dir', test: (p) => p === entry || p.startsWith(`${entry}/`) });
    } else {
      matchers.push({ raw, kind: 'file', test: (p) => p === entry });
    }
  }
  return { matchers, problems };
}

function matchExemption(relPath, matchers) {
  for (const m of matchers) if (m.test(relPath)) return m;
  return null;
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function collectTsFiles(relDir) {
  const out = [];
  for (const entry of readdirSync(path.join(ROOT, relDir), { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...collectTsFiles(rel));
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) out.push(rel);
  }
  return out;
}

// `console.` preceded by a word character (`this.console.`, `fakeConsole.`)
// is not the global; everything else is treated as a hit, including
// commented-out calls — the old grep counted those too, and a commented
// `console.log` is a paste away from being a live one.
const CONSOLE_RE = /(?<![\w$.])console\s*\./;

function main() {
  const failures = [];

  let excludes;
  try {
    excludes = readTsconfigExcludes();
  } catch (err) {
    process.stderr.write(`check-no-console: cannot read the exemption source: ${err.message}\n`);
    process.exit(1);
  }

  const { matchers, problems } = buildMatchers(excludes);
  for (const p of problems) failures.push(`EXEMPTION LIST: ${p}`);

  // --- Self-check: no exemption may cover live code -------------------------
  const reachable = computeReachableSet(ROOT, LIVE_ENTRYPOINTS);
  const liveButExempt = [];
  for (const rel of reachable) {
    if (!(rel === SCAN_DIR || rel.startsWith(`${SCAN_DIR}/`))) continue;
    const m = matchExemption(rel, matchers);
    if (m) liveButExempt.push({ file: rel, via: m.raw });
  }
  for (const { file, via } of liveButExempt) {
    failures.push(
      `EXEMPTION LIST: "${via}" exempts ${file}, which IS reachable from the running server `
      + `(${LIVE_ENTRYPOINTS.join(' / ')}). An exemption may only cover code that does not run. `
      + `This is the exact failure mode that let a console.log sit in the live route barrel.`,
    );
  }

  // --- The gate itself ------------------------------------------------------
  const scanned = [];
  const hits = [];
  for (const rel of collectTsFiles(SCAN_DIR).sort()) {
    if (matchExemption(rel, matchers)) continue;
    scanned.push(rel);
    const src = readFileSync(path.join(ROOT, rel), 'utf8');
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (CONSOLE_RE.test(lines[i])) hits.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
    }
  }
  for (const h of hits) failures.push(`console.* under ${SCAN_DIR}/: ${h}`);

  if (failures.length === 0) {
    process.stdout.write(
      `check-no-console: ${scanned.length} file(s) under ${SCAN_DIR}/ checked, `
      + `${matchers.length} tsconfig quarantine entr(ies) applied, all proven unreachable from the server. OK.\n`,
    );
    process.exit(0);
  }

  process.stderr.write(
    [
      '',
      '='.repeat(72),
      'NO-CONSOLE GATE FAILED',
      '='.repeat(72),
      '',
      ...failures.map((f) => `  - ${f}`),
      '',
      'CLAUDE.md: no console.* under server/** — use server/lib/logger.ts.',
      'Exemptions come from tsconfig.json\'s "exclude" array (the quarantine',
      'declaration) and only hold for code the server cannot reach. Do not add',
      'an exemption to make a live violation pass.',
      '='.repeat(72),
      '',
    ].join('\n'),
  );
  process.exit(1);
}

main();
