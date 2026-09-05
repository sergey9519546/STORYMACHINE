// Source-level guard for the theme convention written down in
// src/styles/design-system.css's header (2026-09-05, client-hunter
// B-11/B-14): a surface is either THEME-INVARIANT (--sm-* panel/text
// tokens, no `dark:` variants) or FULLY THEMED (`dark:` on both background
// and text) — never mixed.
//
// SCOPE, stated honestly: this scans ONE element's own `className` string
// for the co-occurrence of a real `dark:bg-*` background with `text-black`
// or an invariant `text-[var(--sm-ink...)]` token and no `dark:text-` in
// that SAME string — the shape item 5 of the 2026-09-05 client-hunter
// follow-up names as "the exact mixed pattern". An earlier version of this
// scanner tried to also walk each element's JSX descendants (an
// indentation-depth heuristic, since this file does not parse JSX) to catch
// B-11's actual historical shape, where the invariant token sat on a CHILD
// of the dark:bg- card, not the same element. Run for real: it DID catch
// that exact bug when pointed at the pre-fix commit's
// src/components/scriptide/SnapshotManager.tsx (the date caption's
// `text-[var(--sm-ink-mute)]`, nested under the card's `dark:bg-zinc-800`)
// — but it also produced multiple false positives inside
// ScriptDoctorPanel.tsx (a file this lane does not own or edit), because
// tracking "still inside that subtree" from indentation alone silently
// breaks across a 5,000-line file full of conditional JSX blocks whose
// indentation doesn't cleanly close between className-bearing lines. A
// heuristic that flags correct code in a file this lane cannot fix is worse
// than a narrower one that never does, so this scanner stays same-element
// only. It will not catch B-11's or B-14's exact historical shape (B-14's
// invariant ink came from `.sm-btn`'s stylesheet `color:` rule, not a
// Tailwind class at all, and B-11's came from a descendant) — those are
// what scripts/verify-a11y.mjs's browser gates (the Ship-versions and
// slate-table steps, 2026-09-05) exist to catch instead. What this DOES
// catch, cheaply and on every `npm test` with no browser: the same-element
// copy-paste mistake — someone reuses a themed card's className string that
// carries `dark:bg-*` and, in the same string, a stray invariant text
// token, dropping the `dark:text-` half.
//
// Proof this scanner actually has teeth (LANE_STANDARD §3 — a guard must be
// shown able to fail before it's trusted to pass): the first describe block
// below feeds it a fixture with the same-element mixed pattern and asserts
// a violation IS reported, then the same fixture with a `dark:text-`
// override added and asserts none is, then a genuinely fully-themed pairing
// (ScriptDoctorPanel.tsx's real `text-black dark:text-gray-100 ...
// dark:bg-zinc-800` line — correct, must never be flagged) and an ordinary
// theme-invariant element with no `dark:` anything. The cross-element
// capability described above (and its ScriptDoctorPanel false positives)
// was verified by hand during development, against both the pre-fix commit
// and the live tree — the CLAUDE.md-mandated report for this change carries
// that transcript — which is WHY the shipped version below is scoped down.
// The second describe block is the actual regression gate: it scans the
// live src/components tree and requires zero same-element hits.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const COMPONENTS_DIR = join(REPO_ROOT, 'src', 'components');

interface ClassNameEntry {
  line: number;
  indent: number;
  value: string;
}

interface Violation {
  file: string;
  line: number;
  value: string;
}

/** Replaces comment content with spaces (preserving line breaks and overall
 *  length) so a scan never matches its OWN explanatory prose — this file's
 *  neighbors are full of comments that literally say "dark:bg-zinc-800" and
 *  "text-[var(--sm-ink-mute)]" while describing the fix, which would
 *  false-positive a naive text search. */
function stripComments(src: string): string {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return noBlock.replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/** Pulls every `className="..."` / `className={\`...\`}` value out of a
 *  source file, one per line it appears on. `indent` is captured but unused
 *  by the shipped (same-element) detector below — kept on the type because
 *  it is what a future, more careful subtree-aware version would need; see
 *  this file's header for why that version isn't the one shipped here. */
function extractClassNameEntries(source: string): ClassNameEntry[] {
  const stripped = stripComments(source);
  const lines = stripped.split('\n');
  const entries: ClassNameEntry[] = [];
  lines.forEach((line, idx) => {
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const classMatch = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
    if (classMatch) {
      entries.push({ line: idx + 1, indent, value: classMatch[1] ?? classMatch[2] ?? '' });
    }
  });
  return entries;
}

/** The detector: for each element's OWN className string, flags it when it
 *  carries a real `dark:bg-*` background together with `text-black` or an
 *  invariant `text-[var(--sm-ink...)]` token and no `dark:text-` in that
 *  SAME string. Same-element only — see this file's header for why. */
function findThemeConventionViolations(source: string, filePath: string): Violation[] {
  const entries = extractClassNameEntries(source);
  const violations: Violation[] = [];

  for (const entry of entries) {
    const hasDarkBg = /dark:bg-/.test(entry.value);
    const hasDarkText = /dark:text-/.test(entry.value);
    const hasInvariantInkToken = /text-\[var\(--sm-ink/.test(entry.value);
    const hasTextBlack = /\btext-black\b/.test(entry.value);

    if (hasDarkBg && !hasDarkText && (hasInvariantInkToken || hasTextBlack)) {
      violations.push({ file: filePath, line: entry.line, value: entry.value });
    }
  }
  return violations;
}

function listTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listTsxFiles(full));
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('theme-convention scanner — proof it can actually fail (LANE_STANDARD §3)', () => {
  it('flags a single element mixing a real dark:bg- background with an invariant --sm-ink text token and no dark:text- override', () => {
    const badFixture = '<div className="bg-[var(--sm-panel-2)] dark:bg-zinc-800 p-4 text-[var(--sm-ink-mute)]">{s.date}</div>';
    const violations = findThemeConventionViolations(badFixture, 'fixture.tsx');
    assert.ok(
      violations.some((v) => v.value.includes('text-[var(--sm-ink-mute)]')),
      `expected this element to be flagged as a violation; got: ${JSON.stringify(violations)}`,
    );
  });

  it('flags the bare text-black variant of the same mixed pattern', () => {
    const badFixture = '<div className="bg-white dark:bg-zinc-800 p-4 text-black">{s.name}</div>';
    const violations = findThemeConventionViolations(badFixture, 'fixture.tsx');
    assert.equal(violations.length, 1);
  });

  it('does NOT flag the same element once its background is theme-invariant (the actual B-11 fix)', () => {
    const fixedFixture = '<div className="bg-[var(--sm-panel-2)] p-4 text-[var(--sm-ink-mute)]">{s.date}</div>';
    const violations = findThemeConventionViolations(fixedFixture, 'fixture.tsx');
    assert.deepEqual(violations, []);
  });

  it('does NOT flag a genuinely fully-themed pairing (text-black WITH its own dark:text- override)', () => {
    // Matches ScriptDoctorPanel.tsx's real
    // `text-black dark:text-gray-100 ... bg-gray-50 dark:bg-zinc-800` line
    // (a different, actively-owned lane's file) — this is the CORRECT
    // convention #2 (fully themed), not the bug, and must never be flagged.
    const fullyThemedFixture = '<p className="text-xs leading-relaxed text-black dark:text-gray-100 bg-gray-50 dark:bg-zinc-800 border-2 p-3">text</p>';
    const violations = findThemeConventionViolations(fullyThemedFixture, 'fixture.tsx');
    assert.deepEqual(violations, []);
  });

  it('does NOT flag an ordinary theme-invariant surface with no dark: anything', () => {
    const invariantFixture = '<div className="bg-[var(--sm-panel-2)]"><span className="text-[var(--sm-ink-mute)]">x</span></div>';
    const violations = findThemeConventionViolations(invariantFixture, 'fixture.tsx');
    assert.deepEqual(violations, []);
  });
});

describe('theme-convention scanner — the actual regression gate over src/components', () => {
  it('finds zero dark:bg-/invariant-text mixed-convention violations in the live tree', () => {
    const files = listTsxFiles(COMPONENTS_DIR);
    assert.ok(files.length > 50, `sanity: expected many .tsx files under src/components, found ${files.length}`);

    const allViolations: Violation[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const rel = relative(REPO_ROOT, file);
      allViolations.push(...findThemeConventionViolations(source, rel));
    }

    assert.deepEqual(
      allViolations,
      [],
      `mixed theme-convention pattern found (dark:bg-* with an invariant/black text token and no dark:text- compensator):\n`
      + allViolations.map((v) => `  ${v.file}:${v.line} — ${v.value}`).join('\n'),
    );
  });
});
