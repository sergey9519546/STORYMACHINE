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
import { execFileSync } from 'node:child_process';

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

// Tracked user-facing artifacts that live OUTSIDE the scanned dirs (under
// docs/**) but must not retain retired overclaim wording. The committed P0
// sample coverage report is a writer-facing stimulus shown in P0 sessions;
// if the renderer's copy is corrected, this artifact must follow it or the
// two surfaces drift. Listed explicitly (not by walking docs/) so the audit
// still ignores the rest of docs/** — the candid internal audit trail.
const SCAN_TRACKED_ARTIFACTS = [
  'docs/user-validation/sample-coverage-report.html',
];

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
  // Allow legitimate non-overclaim uses of "guarantee(s)"/"guaranteed" via
  // negative lookbehinds/lookahead on the constructions present in this codebase:
  //   - "not a hard guarantee" — honest disclaimer (RevisionPanel, doctor.ts)
  //     explaining what the tool does NOT claim.
  //   - "as guaranteed <adj>" / "reads as guaranteed" — literary-perception
  //     language in originality.ts describing how an audience perceives a
  //     story pattern (e.g. "a pivot scene reads as guaranteed clue-free",
  //     "a seed scene as guaranteed pivot-free"), not a promise about the tool.
  //   - "guaranteed to <verb>" — factual descriptions of deterministic game
  //     mechanics, e.g. decision.ts's REVEAL action ("guaranteed to land as
  //     real knowledge"), which the engine actually enforces (Orchestrator's
  //     _applyReveal writes the belief at 0.85 confidence). Real overclaims
  //     modify a quality noun ("guaranteed results/quality/satisfaction"),
  //     so excluding only the "guaranteed to <verb>" form keeps the net tight.
  // The [ds]? closes the earlier gap where only the base verb and "guarantees"
  // were matched; genuine product overclaims still trip the pattern.
  { name: 'guarantees', re: /(?<!not a hard )(?<!as )\bguarantee[ds]?\b(?! to\b)/gi },
  { name: 'industry-standard', re: /\bindustry[\s-]?standard\b/gi },
  { name: 'objectively-correct', re: /\bobjectively correct\b/gi },
  { name: 'scientifically', re: /\bscientifically\b/gi },
  { name: 'superlatives', re: /\b(unparalleled|unmatched|unrivaled|best-in-class|world-class|state-of-the-art|revolutionary|game-chang\w*)\b/gi },
  { name: 'auc-user-facing', re: /\bAUC\b/g, scopeExts: null, scopeDirs: ['src', 'public'] },
  { name: 'no-competitor-can-claim', re: /\bno (other )?(tool|app|platform|competitor)s? can claim\b/gi },
  { name: 'the-only-tool', re: /\bthe only (tool|app|platform|way)\b/gi },
  // ── Lever 3 retired report overclaims ───────────────────────────────────
  // These phrases were deliberately removed from writer-facing report copy
  // because the claim audit (docs/scoring/REPORT_CLAIM_AUDIT.md) found them
  // overstated or unsupported. They are banned in the user-facing surfaces
  // (src/**, public/**) and the committed P0 sample report so the report
  // cannot regress to them and the sample cannot drift from the renderer.
  // Internal candid commentary in server/** and tests/** is out of scope.
  {
    name: 'report-verification-hash',
    re: /Verification hash/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  {
    name: 'report-same-verdict-every-time',
    re: /same script, same verdict, every time/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  {
    name: 'report-stronger-than-reference-set',
    re: /stronger than \d+% of the reference set/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  {
    name: 'report-craft-score',
    re: /overall craft score/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  {
    name: 'report-rarest-endorsement',
    re: /rarest, strongest endorsement/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  {
    name: 'report-strongest-part',
    re: /strongest part of the draft/gi,
    scopeExts: null,
    scopeDirs: ['src', 'public'],
  },
  // The committed P0 sample report lives under docs/** (tracked artifact),
  // which is outside src/public, so it needs its own scoped entry covering
  // the same retired phrases plus the leg of the determinism footer that
  // collapsed reproducibility into a correctness claim.
  {
    name: 'p0-sample-retired-overclaims',
    re: /Verification hash|same script, same verdict, every time|stronger than \d+% of the reference set|overall craft score|rarest, strongest endorsement|strongest part of the draft/gi,
    scopeExts: null,
    scopeDirs: ['docs'],
  },
];

// ---------------------------------------------------------------------------
// Docs-wide stale rule-count scan (narrow extension, 2026-08-03)
// ---------------------------------------------------------------------------
// PATTERNS above (and the SCAN_DIRS/SCAN_ROOT_FILES/SCAN_TRACKED_ARTIFACTS
// it runs over) are UNCHANGED by this section. This is a second, independent
// pass added because AGENTS.md and CHANGELOG.md both carried the disproven
// "8,917 rules" figure, uncorrected, for weeks: neither file was ever
// scanned (SCAN_ROOT_FILES covers only README.md of the root *.md files),
// and docs/** was never scanned at all.
//
// This pass deliberately does NOT reuse the tone/superlative entries in
// PATTERNS and does NOT lift the docs/** exemption in general — per the
// scope comment above, docs/** is "the candid internal audit trail," and a
// blanket extension would wrongly flag honest self-critical writing (this
// repo's own audit reports discuss "8,917" by name dozens of times,
// precisely BECAUSE they are the investigation that disproved it). Instead
// it scans every git-tracked *.md for exactly the four fabricated/disproven
// rule-count figures, and flags a match only when BOTH:
//
//   1. it reads as being about the rule catalog at all — the word
//      "rule"/"rules"/"rulebook" appears somewhere in the same paragraph or
//      table block as the number. This is what keeps the check narrow:
//      e.g. a root-level doc's unrelated "12,700 systems" catalog is a
//      different claim this audit has no opinion on, and never mentions
//      rules near it, so it is not flagged.
//   2. AND that same block carries no marker that the number is being
//      discussed AS disproven/historical rather than asserted as current
//      fact. CHANGELOG.md's "~8,917 rules ... that count was DISPROVEN by
//      the 2026-07-14 audit" and AGENTS.md's 'the "8,917" figure this line
//      used to carry ... DISPROVEN' both carry such a marker in the same
//      sentence, so both keep passing; a bare, unqualified "the rulebook
//      has 8,917 rules" would not.
//
// 3,216 — the CURRENT machine-counted count — is deliberately excluded from
// this pass. PATTERNS above already bans it, but only in the user-facing
// surface, for an unrelated reason (ROADMAP §4: even the TRUE count is an
// unwanted marketing claim there), not because it is wrong. Banning it
// repo-wide here would break ROADMAP.md, NORTH_STAR.md, CLAUDE.md, AGENTS.md
// and most of docs/p1-benchmark/, which correctly and necessarily cite
// 3,216 as fact.
const DOC_STALE_NUMBER_PATTERNS = [
  { name: 'doc-stale-count-8917', re: /\b8,?917\b/g },
  { name: 'doc-stale-count-10523', re: /\b10,?523\b/g },
  { name: 'doc-stale-count-5701', re: /\b5,?701\b/g },
  { name: 'doc-stale-count-12700', re: /\b12,?700\b/g },
];

const RULE_TOPIC_RE = /\brules?\b|\brulebook\b/i;
// Deliberately generous: this is a "does the surrounding prose visibly frame
// the number as PAST/wrong rather than current?" check, not a strict single
// keyword. Every phrase below is one actually used somewhere in this repo's
// existing, legitimate historical mentions (CHANGELOG.md, AGENTS.md,
// ROADMAP.md's "Earlier docs ... disagreed") — this list grows by finding
// real phrasing, not by guessing.
const HISTORICAL_LABEL_RE = /\b(disprove[nd]?|disproving|disprov(?:ed|es)|retract(?:ed|ion)?|superseded|fabricat(?:ed|ion)|unsupported|inaccurate|reject(?:ed|s)?|debunked|falsely|never happened|did not occur|no such|alleged(?:ly)?|used to (?:carry|say|claim|read)|originally said|no longer accurate|correction attached|shown to be|was (?:inaccurate|wrong|false)|is (?:false|wrong|incorrect)|not accurate|disagreed|earlier (?:docs|prose|version|plan|figure)|stale plan)\b/i;

// Whole-file/directory exemptions for THIS pass only (PATTERNS above and the
// surfaces it scans are unaffected). Every entry is a closed, dated,
// point-in-time document from the same 2026-07-14/07-15 investigation that
// this repo's own docs describe repeatedly — not living guidance a
// contributor would read as current (CLAUDE.md's own orientation list names
// ROADMAP/NORTH_STAR/ULTRAPLAN/ARCHITECTURE/README; none of these are on
// it, and docs/user-validation/P1_BASELINE_INVENTORY.md's own header still
// says "P1 HAS NOT STARTED" — itself superseded, same as this fix's item 1).
// This repo's established convention for a disproven figure in a document
// people still read (CHANGELOG.md's 1.0.0 entry) is to leave the record in
// place with a correction attached NEARBY, not to silently rewrite it —
// scattering ad hoc "disproven" markers through dozens of unrelated
// sentences in these closed audit artifacts would be revisionist history,
// not honesty. Exempting the file preserves the record intact instead.
const DOC_STALE_NUMBER_EXEMPT_PREFIXES = [
  'docs/audits/', // dated audit-report directory — forensic/retrospective genre, same idea as the tests/ directory exemption above
  'docs/filed-backlog/', // CLAUDE.md: "filed backlog, not active direction"
  'docs/superpowers/', // dated planning/spec docs for the same closed remediation effort (filenames carry 2026-07-14/07-15 stamps)
  'docs/DEEP_AUDIT_2026-07-14.md', // the original dated gap-audit that first surfaced — and, at the time, itself repeated — the inflated count
  'docs/VISION_REBUILD.md', // "written 2026-07-14 against the DEEP_AUDIT" (its own header) — a dated sketch, not current direction
  'docs/PROJECT_GAP_ANALYSIS.md', // dated 2026-07-15 in its own header, same genre as DEEP_AUDIT
  'docs/user-validation/SESSION_LOG_2026-07-15.md', // dated session log
  'docs/user-validation/P1_BASELINE_INVENTORY.md', // dated pre-P1 inventory, superseded in full (see item 1 of this fix)
];

function isDocStaleNumberExempt(relPosixPath) {
  return DOC_STALE_NUMBER_EXEMPT_PREFIXES.some(
    (p) => relPosixPath === p || relPosixPath.startsWith(p)
  );
}

// Every git-tracked *.md, via `git ls-files` so this automatically respects
// .gitignore (e.g. data/, .claude/) and never touches generated/untracked
// scratch files. Falls back to a manual whole-tree walk (same node_modules/
// dist/.git exclusions as walk() below) if git is unavailable, so this pass
// still runs — rather than silently vanishing — in a non-git checkout.
function listTrackedMarkdown() {
  try {
    const out = execFileSync('git', ['ls-files', '-z', '--', '*.md'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return out.split('\0').filter(Boolean).map((f) => join(ROOT, f));
  } catch {
    const files = [];
    for (const f of walk(ROOT)) {
      if (extname(f) === '.md') files.push(f);
    }
    return files;
  }
}

// Splits text into blank-line-delimited blocks with their line ranges. A
// long markdown table has no blank lines between rows, so it is one block —
// a disproof marker two rows away in the same table still counts as
// "explicitly labeled," which is the same generosity a human reader would
// extend when skimming a table of audit findings.
function paragraphBlocks(text) {
  const lines = text.split('\n');
  const blocks = []; // { startLine, endLine, text } — 0-based, inclusive
  let curStart = -1;
  let curLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() === '') {
      if (curLines.length) {
        blocks.push({ startLine: curStart, endLine: i - 1, text: curLines.join('\n') });
        curLines = [];
        curStart = -1;
      }
    } else {
      if (curStart === -1) curStart = i;
      curLines.push(lines[i]);
    }
  }
  if (curLines.length) {
    blocks.push({ startLine: curStart, endLine: lines.length - 1, text: curLines.join('\n') });
  }
  return blocks;
}

function blockTextForLine(blocks, lineIdx) {
  for (const b of blocks) {
    if (lineIdx >= b.startLine && lineIdx <= b.endLine) return b.text;
  }
  return '';
}

function scanDocStaleNumbers(files) {
  const hits = [];
  for (const filePath of files) {
    const rel = relative(ROOT, filePath);
    const relPosix = rel.split(/[\\/]/).join('/');
    if (isDocStaleNumberExempt(relPosix)) continue;
    let raw;
    try {
      raw = readFileSync(filePath, 'utf8');
    } catch {
      continue; // stale ls-files entry (deleted-but-not-yet-committed) — skip
    }
    const lines = raw.split('\n');
    const blocks = paragraphBlocks(raw);
    for (const pattern of DOC_STALE_NUMBER_PATTERNS) {
      lines.forEach((line, idx) => {
        pattern.re.lastIndex = 0;
        let m;
        while ((m = pattern.re.exec(line)) !== null) {
          const blockText = blockTextForLine(blocks, idx);
          if (RULE_TOPIC_RE.test(blockText) && !HISTORICAL_LABEL_RE.test(blockText)) {
            hits.push({ file: rel, line: idx + 1, match: m[0], pattern: pattern.name });
          }
          if (m[0].length === 0) pattern.re.lastIndex += 1; // guard zero-width
        }
      });
    }
  }
  return hits;
}

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
  for (const f of SCAN_TRACKED_ARTIFACTS) {
    const full = join(ROOT, f);
    try {
      statSync(full);
      files.push(full);
    } catch {
      // Optional tracked artifact not present — skip silently.
    }
  }
  return files;
}

function shouldScan(filePath) {
  const rel = relative(ROOT, filePath);
  // Normalize to forward slashes so the tracked-artifact list (which uses
  // POSIX separators) matches on Windows too, where path.relative yields \.
  const relPosix = rel.split(/[\\/]/).join('/');
  const ext = extname(filePath);
  if (EXEMPT_NAME_RE.test(basename(filePath))) return false;
  // Explicitly-listed tracked artifacts (under docs/**) are always scanned
  // regardless of directory extension allowlists.
  if (SCAN_TRACKED_ARTIFACTS.includes(relPosix)) return true;
  const topDir = rel.split(/[\\/]/)[0];
  const allowedExts = DIR_EXTS[topDir];
  if (allowedExts) return allowedExts.has(ext); // src/, public/, server/
  return SCAN_ROOT_FILES.includes(relPosix); // individually-named root files
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
      const topDir = rel.split(/[\\/]/)[0];
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

  const mdFiles = listTrackedMarkdown();
  allHits.push(...scanDocStaleNumbers(mdFiles));

  if (allHits.length > 0) {
    console.error(`honesty-audit: ${allHits.length} violation(s) found\n`);
    for (const h of allHits) {
      console.error(`${h.file}:${h.line}: [${h.pattern}] "${h.match}"`);
    }
    console.error(`\nhonesty-audit: FAIL — remove or rewrite the strings above.`);
    process.exit(1);
  }

  console.log(
    `honesty-audit: scanned ${files.length} files, plus ${mdFiles.length} tracked ` +
      `markdown files for stale rule-count numbers — clean.`
  );
  process.exit(0);
}

main();
