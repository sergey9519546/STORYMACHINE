#!/usr/bin/env node
// honesty-audit.mjs — G0-08 honesty string audit.
//
// Scans the tree for user-facing overclaim language (unverified superlatives,
// "provably"/"guarantees" language the product cannot back, and stale
// hardcoded corpus/rule-count numbers) and fails the build if any is found.
// This script IS the test: it is meant to fail loudly on a dirty tree and
// pass silently on a clean one. See CLAUDE.md's honesty-string discipline
// and the G0-08 task in the Minimum Trustworthy Demo plan.
//
// Zero dependencies — plain Node, `node scripts/honesty-audit.mjs`.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------
// Enforced roots: src/** (.ts/.tsx/.css), public/** (web-asset text files),
// server/** (.ts only — "server .ts files: strip comments, then scan
// remaining string literals" per the task spec; server/**/*.md such as the
// retired WAVE_QUALITY_GUARANTEE.md are candid internal history, same as
// root *.md files, and stay out of scope), plus the individual root files
// index.html, README.md, metadata.json, package.json.
//
// tests/**, *.test.ts, *.bench.ts, and everything outside the roots above
// (docs/**, other root *.md files such as ROADMAP.md/NORTH_STAR.md/
// CLAUDE.md — the candid internal audit trail) are exempt by construction:
// we simply never walk into them.
const SCAN_ROOT_FILES = ['index.html', 'README.md', 'metadata.json', 'package.json'];

// Per-directory extension allowlist (skips binaries like the woff2 fonts
// under public/fonts/, and keeps server/** scoped to .ts as specified).
const DIR_EXTS = {
  src: new Set(['.ts', '.tsx', '.css']),
  public: new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt']),
  server: new Set(['.ts']),
};
const SCAN_DIRS = Object.keys(DIR_EXTS);

// For these extensions, strip // and /* */ comments before matching, so
// honest internal engineering commentary (e.g. doctor.ts's AUC measurement
// notes) doesn't trip the audit — only user-facing strings matter here.
const COMMENT_STRIP_EXTS = new Set(['.ts', '.tsx', '.css', '.js', '.mjs', '.cjs']);

const EXEMPT_NAME_RE = /\.test\.ts$|\.bench\.ts$/;
const EXEMPT_DIR_SEGMENT = 'tests';

// ---------------------------------------------------------------------------
// Banned patterns
// ---------------------------------------------------------------------------
// Each entry: { name, re (global, case-insensitive where sensible), scopeExts }
// scopeExts === null means "all scanned extensions"; otherwise restrict to
// the given extensions (used for the AUC ban, which only applies to
// src/**/public/** — server-side measurement logging is a different
// audience and out of scope per the task spec).
const PATTERNS = [
  { name: 'hollywood-standard', re: /hollywood[\s-]+(gold[\s-]+)?standard/gi },
  { name: 'hollywood-grade', re: /hollywood[\s-]+(grade|level|quality)/gi },
  { name: 'provably', re: /provably/gi },
  { name: 'stale-count-3216', re: /\b3,?216\b/g },
  { name: 'stale-count-8917', re: /\b8,?917\b/g },
  { name: 'stale-count-10523', re: /\b10,?523\b/g },
  { name: 'stale-count-5701', re: /\b5,?701\b/g },
  { name: 'stale-count-12700', re: /\b12,?700\b/g },
  { name: 'corpus-measured', re: /corpus-measured/gi },
  // Require 3+ digit numbers so legitimate small counts ("12 validation
  // rules") don't false-positive; tuned per task instructions rather than
  // allowlisting broadly.
  { name: 'n-rules-claim', re: /\b\d{3,}[\d,]*\s+(deterministic\s+)?rules\b/gi },
  // Allow the honest disclaimer phrase "not a hard guarantee" (RevisionPanel
  // and doctor.ts use it to explain what the tool does NOT claim). Negative
  // lookbehind on "not a hard " immediately preceding "guarantee".
  { name: 'guarantees', re: /(?<!not a hard )\bguarantees?\b/gi },
  { name: 'industry-standard', re: /\bindustry[\s-]?standard\b/gi },
  { name: 'objectively-correct', re: /\bobjectively correct\b/gi },
  { name: 'scientifically', re: /\bscientifically\b/gi },
  { name: 'superlatives', re: /\b(unparalleled|unmatched|unrivaled|best-in-class|world-class|state-of-the-art|revolutionary|game-chang\w*)\b/gi },
  { name: 'auc-user-facing', re: /\bAUC\b/g, scopeExts: null, scopeDirs: ['src', 'public'] },
  { name: 'no-competitor-can-claim', re: /\bno (other )?(tool|app|platform|competitor)s? can claim\b/gi },
  { name: 'the-only-tool', re: /\bthe only (tool|app|platform|way)\b/gi },
];

// ---------------------------------------------------------------------------
// Comment stripping
// ---------------------------------------------------------------------------
// Regex-based stripper for // and /* */ comments in JS/TS-family source.
//
// A naive quote-tracking-only version was tried first and turned out to have
// a real pathological case (found by this very TDD loop, on this codebase):
// regex literals containing quote characters inside a character class, e.g.
// `.replace(/[^a-z0-9' ]/g, ' ')` in fountain-analyzer.ts. The lone `'`
// inside `[...]` was mis-read as a string-open, which then desynced quote
// tracking for the rest of the file and let a real `//` comment slip
// through un-stripped ~1600 lines later. isRegexContext() below is a
// heuristic (not a full tokenizer) that recognizes the common "a regex
// literal can follow here" positions — after `(`, `,`, `=`, other operators,
// or keywords like `return`/`typeof` — so `/.../ ` bodies are skipped as a
// unit instead of being walked character-by-character.
function isRegexContext(out) {
  const tail = out.slice(-24);
  if (/(^|[([{,;:=!&|?+\-*%<>~^])\s*$/.test(tail)) return true;
  if (/\b(return|typeof|case|do|else|in|of|instanceof|new|delete|void|throw|yield|await)\s*$/.test(tail)) return true;
  return false;
}

function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let inString = null; // one of ' " ` or null
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (inString) {
      out += c;
      if (c === '\\') {
        // Preserve escaped char verbatim so we don't mis-detect string end.
        if (i + 1 < n) { out += src[i + 1]; i += 2; continue; }
      }
      if (c === inString) inString = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && c2 === '/') {
      // Line comment — skip to end of line, keep the newline.
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') out += '\n'; // preserve line numbers
        i += 1;
      }
      i += 2; // skip closing */
      continue;
    }
    if (c === '/' && isRegexContext(out)) {
      // Regex literal — copy verbatim (harmless: regex syntax carries no
      // English-language claims) so quote characters inside `[...]` can't
      // desync the string tracker above.
      const start = i;
      i += 1;
      let inClass = false;
      while (i < n && src[i] !== '\n') {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '[') { inClass = true; i += 1; continue; }
        if (src[i] === ']') { inClass = false; i += 1; continue; }
        if (src[i] === '/' && !inClass) { i += 1; break; }
        i += 1;
      }
      while (i < n && /[a-z]/i.test(src[i])) i += 1; // trailing flags (g, i, m, ...)
      out += src.slice(start, i);
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------
function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === EXEMPT_DIR_SEGMENT) continue;
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function collectFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    for (const f of walk(join(ROOT, dir))) {
      files.push(f);
    }
  }
  for (const f of SCAN_ROOT_FILES) {
    const full = join(ROOT, f);
    try {
      statSync(full);
      files.push(full);
    } catch {
      // Optional file not present — skip silently.
    }
  }
  return files;
}

function shouldScan(filePath) {
  const rel = relative(ROOT, filePath);
  const ext = extname(filePath);
  if (EXEMPT_NAME_RE.test(basename(filePath))) return false;
  const topDir = rel.split('/')[0];
  const allowedExts = DIR_EXTS[topDir];
  if (allowedExts) return allowedExts.has(ext); // src/, public/, server/
  return SCAN_ROOT_FILES.includes(rel); // individually-named root files
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------
function scanFile(filePath) {
  const rel = relative(ROOT, filePath);
  const ext = extname(filePath);
  const raw = readFileSync(filePath, 'utf8');
  const text = COMMENT_STRIP_EXTS.has(ext) ? stripComments(raw) : raw;
  const lines = text.split('\n');

  const hits = [];
  for (const pattern of PATTERNS) {
    if (pattern.scopeDirs) {
      const topDir = rel.split('/')[0];
      if (!pattern.scopeDirs.includes(topDir)) continue;
    }
    lines.forEach((line, idx) => {
      pattern.re.lastIndex = 0;
      let m;
      while ((m = pattern.re.exec(line)) !== null) {
        hits.push({ file: rel, line: idx + 1, match: m[0], pattern: pattern.name });
        if (m[0].length === 0) pattern.re.lastIndex += 1; // guard zero-width
      }
    });
  }
  return hits;
}

function main() {
  const files = collectFiles().filter(shouldScan);
  const allHits = [];
  for (const f of files) {
    allHits.push(...scanFile(f));
  }

  if (allHits.length > 0) {
    console.error(`honesty-audit: ${allHits.length} violation(s) found\n`);
    for (const h of allHits) {
      console.error(`${h.file}:${h.line}: [${h.pattern}] "${h.match}"`);
    }
    console.error(`\nhonesty-audit: FAIL — remove or rewrite the strings above.`);
    process.exit(1);
  }

  console.log(`honesty-audit: scanned ${files.length} files — clean.`);
  process.exit(0);
}

main();
