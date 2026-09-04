// The coverage letter's "no escaping needed" assumption, pinned (2026-09-04,
// security review finding #4).
//
// server/lib/coverage-letter.ts emits Markdown and plain text with the
// screenplay's own words — title, author, scene text, issue descriptions —
// interpolated RAW. A title of `Hamlet</p><script>alert(1)</script>` comes
// back verbatim as the letter's H1 (verified live). That is inert today for
// exactly one reason: nothing in this codebase ever renders a coverage letter
// as HTML. The client downloads the markdown as a .md file and stops there;
// src/ contains no Markdown renderer and no dangerouslySetInnerHTML.
//
// That reason was, until now, a COMMENT — the module deferred the safety
// question to future consumers with nothing enforcing the deferral. Coverage
// letters are built to be shared outward, and in a collab room the person who
// plants a hostile title is not the person who exports and shares the letter.
// So the assumption is now a test: the day someone adds a Markdown renderer or
// an innerHTML sink to src/, THIS fails and the letter has to be escaped
// first. Fix the escaping, not the test.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(REPO, 'src');

/** Client-side Markdown renderers, the ones that would turn the letter's raw
 *  angle brackets into live markup (most honour inline HTML by default). */
const MARKDOWN_RENDERERS = [
  'react-markdown', 'markdown-it', 'marked', 'showdown', 'snarkdown',
  'micromark', 'remark-html', 'commonmark', '@mdx-js',
];

const HOSTILE_TITLE = 'Hamlet</p><script>alert(1)</script>';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Files that import a Markdown renderer, or write raw HTML into the DOM. */
function htmlRenderingSinks(): string[] {
  const hits: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    // Comments talk about these on purpose (including this test's own
    // neighbours), so only real import/require statements count.
    const imports = [...source.matchAll(/(?:from|require\()\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    if (imports.some((spec) => MARKDOWN_RENDERERS.some((lib) => spec === lib || spec.startsWith(`${lib}/`)))) {
      hits.push(`${path.relative(REPO, file)} (markdown renderer import)`);
    }
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(source)) {
      hits.push(`${path.relative(REPO, file)} (raw HTML sink)`);
    }
  }
  return hits;
}

/** The smallest report renderCoverageLetter accepts, with the hostile title
 *  flowing through the option it actually reads. */
function letterFor(title: string): string {
  const report = {
    health: 62, grade: 'solid', verdict: 'CONSIDER', sceneCount: 12, wordCount: 5_400,
    totalIssues: 4, bySeverity: { critical: 0, major: 2, minor: 2 },
    plainSummary: 'A draft with promise.', strengths: [], topPriorities: [], rootCauses: [],
    passes: [], sceneHeatmap: [], characters: ['ALICE'], analyzedAt: 0,
    contentHash: 'a'.repeat(64), analysisComplete: true,
  } as unknown as ScriptDoctorReport;
  return renderCoverageLetter(report, { title }).markdown;
}

describe('coverage letter — the no-renderer assumption that makes raw text safe', () => {
  it('emits the screenplay\'s text unescaped (the premise the rest of this file depends on)', () => {
    // Not an endorsement — a statement of the current contract. If this ever
    // stops being true because the letter started escaping, the guard below
    // is free to relax; that is why it is asserted here rather than assumed.
    assert.ok(
      letterFor(HOSTILE_TITLE).includes(HOSTILE_TITLE),
      'the letter no longer emits raw text — update this file to match',
    );
  });

  it('nothing in src/ renders markdown or writes raw HTML, so the raw text stays inert', () => {
    const sinks = htmlRenderingSinks();
    const letterEscapes = !letterFor(HOSTILE_TITLE).includes('<script>');
    assert.ok(
      sinks.length === 0 || letterEscapes,
      'src/ gained an HTML-rendering path while server/lib/coverage-letter.ts still emits raw, '
      + `unescaped screenplay text:\n  ${sinks.join('\n  ')}\n`
      + 'A coverage letter is written to be shared, and in a collab room the writer of the script is '
      + 'not necessarily the person who exports it — so unescaped angle brackets reaching a renderer '
      + 'is script injection sourced from screenplay text. Escape the letter (or route it through '
      + 'coverage-html.ts\'s escapeHtml) before landing that renderer; do not relax this test.',
    );
  });
});
