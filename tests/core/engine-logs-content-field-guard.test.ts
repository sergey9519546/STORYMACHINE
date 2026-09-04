// engine-logs-content-field-guard.test.ts — a lint-style guard that a
// content-bearing field can never again reach a server/engine/** log line
// without going through server/lib/log-redact.ts's describeContent().
//
// CONTEXT. The privacy lane's keyless log test
// (tests/routes/no-writer-content-in-logs.test.ts) cannot reach
// server/engine/** at all — that surface only runs with an AI provider key
// configured (it is Labs-only in the product). An audit of it found
// parse-failure branches logging `preview: <raw LLM output>.substring(0,
// 120)` directly. Those call sites were fixed (server/lib/log-redact.ts's
// describeContent()/idRef()); this test is the mechanical guard that keeps a
// FUTURE call site from reintroducing the same shape by accident — the
// behavioral proof that the fix actually works (a fake provider driving the
// real parse-failure branches, with the flag on and off) lives in
// engine-parse-failure-logs-no-writer-content.test.ts, a sibling in this
// directory.
//
// APPROACH. Same shape as the repo's other source-scanning guards
// (scripts/check-no-console.mjs; tests/core/g0-04-programmatic-install-gate.
// test.ts): read the real source, not a compiled/typed view of it, and fail
// loudly on the exact line a violation would land on. This one finds every
// `logger.<level>(...)` call, isolates that call's own argument text with a
// hand-rolled balanced-delimiter scanner (so a field name appearing in
// unrelated code six lines later — a following statement, a schema literal
// elsewhere in the file — can never produce a false positive or negative),
// and greps THAT text for the known content-bearing field names. A hit is
// only a failure if the field's value expression does not itself call
// describeContent(...).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCAN_DIR = 'server/engine';

// The exact field names named in the finding this test exists to enforce.
// Not "agent" — character-name-as-identifier is handled at each site by
// idRef() and reviewed by hand (see the CLAUDE.md-adjacent decision this
// guard's sibling test documents); a bare id field is not, by itself,
// evidence of a content leak the way a raw-text field is.
const CONTENT_FIELDS = ['preview', 'raw', 'text', 'proposition', 'content', 'output'];
const FIELD_RE = new RegExp(`(?<![\\w$.])(${CONTENT_FIELDS.join('|')})\\s*:`, 'g');
const SANCTIONED_CALL = 'describeContent(';

function collectTsFiles(absDir: string, relDir: string, out: string[]): void {
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) { collectTsFiles(abs, rel, out); continue; }
    if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(rel);
  }
}

/** Scans forward from `openIdx` (the '(' right after `logger.<level>`) and
 *  returns the index just past its matching ')'. Tracks string/template/
 *  regex-free nesting (this codebase's logger calls never contain a regex
 *  literal) so a ')' or '{' inside a quoted string never desyncs the count. */
function findMatchingParen(src: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === '\\') i++; // skip escaped char (handles \" and the like)
        i++;
      }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error(`unbalanced parens scanning from index ${openIdx}`);
}

/** For one field-name match inside a logger call's argument text, returns the
 *  value expression up to the next top-level ',' or the end of the text
 *  (balanced against (), {}, [] and quotes, mirroring findMatchingParen's
 *  string handling). */
function valueExprAfter(argsText: string, colonEnd: number): string {
  let depth = 0;
  let i = colonEnd;
  for (; i < argsText.length; i++) {
    const ch = argsText[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      i++;
      while (i < argsText.length && argsText[i] !== quote) {
        if (argsText[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') { if (depth === 0) break; depth--; }
    else if (ch === ',' && depth === 0) break;
  }
  return argsText.slice(colonEnd, i);
}

const LOGGER_CALL_RE = /\blogger\.(debug|info|warn|error)\s*\(/g;

interface Violation { file: string; line: number; field: string; snippet: string; }

function scanFile(relPath: string, source: string): Violation[] {
  const violations: Violation[] = [];
  LOGGER_CALL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LOGGER_CALL_RE.exec(source)) !== null) {
    const openIdx = m.index + m[0].length - 1; // index of the '('
    const closeIdx = findMatchingParen(source, openIdx);
    const argsText = source.slice(openIdx + 1, closeIdx - 1);

    FIELD_RE.lastIndex = 0;
    let fm: RegExpExecArray | null;
    while ((fm = FIELD_RE.exec(argsText)) !== null) {
      const value = valueExprAfter(argsText, fm.index + fm[0].length);
      if (value.includes(SANCTIONED_CALL)) continue;
      const line = source.slice(0, openIdx + fm.index).split('\n').length;
      violations.push({
        file: relPath,
        line,
        field: fm[1],
        snippet: `${fm[1]}:${value.trim().slice(0, 80)}`,
      });
    }
  }
  return violations;
}

describe('server/engine/** logger calls never carry a content-bearing field unredacted', () => {
  it('every preview/raw/text/proposition/content/output field goes through describeContent()', () => {
    const files: string[] = [];
    collectTsFiles(path.join(REPO_ROOT, SCAN_DIR), SCAN_DIR, files);
    assert.ok(files.length > 10, `sanity: expected many files under ${SCAN_DIR}, found ${files.length}`);

    const violations: Violation[] = [];
    for (const rel of files.sort()) {
      const source = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      violations.push(...scanFile(rel, source));
    }

    assert.deepEqual(
      violations,
      [],
      'A logger call under server/engine/** passes a content-bearing field '
      + '(preview/raw/text/proposition/content/output) whose value does not call '
      + "describeContent(...) from server/lib/log-redact.ts. That field can carry the "
      + 'writer\'s own story text (a raw LLM response, a parsed proposition, an outline '
      + "beat) straight into this deployment's logs. Route the value through "
      + 'describeContent() (or, if the field genuinely never carries writer-derived text, '
      + 'rename it — the point of this guard is that the field NAME is the signal — so a '
      + 'reviewer does not have to re-derive that at every future edit):\n'
      + violations.map(v => `  ${v.file}:${v.line}  ${v.snippet}`).join('\n'),
    );
  });

  it('sanity: the scanner actually flags an unredacted content field (proves the guard is not vacuous)', () => {
    const probe = "logger.warn('probe', { agent: idRef(x), preview: rawText.substring(0, 120) });";
    const violations = scanFile('PROBE.ts', probe);
    assert.equal(violations.length, 1, 'expected the scanner to catch the deliberately unredacted `preview` field');
    assert.equal(violations[0].field, 'preview');
  });

  it('sanity: the scanner accepts a field routed through describeContent()', () => {
    const probe = "logger.warn('probe', { agent: idRef(x), preview: describeContent(rawText) });";
    const violations = scanFile('PROBE.ts', probe);
    assert.deepEqual(violations, []);
  });
});
