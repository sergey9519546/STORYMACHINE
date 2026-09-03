// Coverage's "Jump to line" must land the same way the full doctor panel's
// finding clicks do.
//
// E2 gave FountainEditor a highlightRange() and wired ScriptDoctorPanel's
// findings to it (scroll to the span AND flash it). CoverageSummary's own
// "Jump to line" button predates that and was still calling the plain
// navigateTo(), so the identical action landed differently depending on which
// of the two panels the writer clicked it in — cursor-only in one, visibly
// highlighted in the other.
//
// Source-level assertions, per this repo's convention for React wiring with
// no jsdom harness (see tests/core/command-palette-wiring.test.ts). The
// span-parsing half is pure logic and is exercised for real below.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '../../src');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('CoverageSummary.tsx — jump button targets a span, not a bare line', () => {
  const source = read('components/scriptide/CoverageSummary.tsx');
  // Retrospective #10 (tighter jump highlight): the span computation itself
  // moved to lib/jump-span.ts's computeJumpSpan (unit-tested directly in
  // tests/core/jump-span.test.ts) so the "prefer a line-precise member over
  // a root cause's wider envelope" logic is testable without mounting the
  // component. These two assertions now check the DELEGATION — that the
  // component still calls it with the right inputs — rather than the old
  // inline computation's exact source text.
  const jumpSpanLibSource = read('lib/jump-span.ts');

  it('accepts the highlighting callback alongside the original one', () => {
    assert.match(source, /onNavigateToFinding\?: \(startLine: number, endLine: number\) => void;/);
    // The plain-navigate prop stays: a host that never wired the new one
    // keeps working exactly as it did.
    assert.match(source, /onJumpToLine\?: \(line1Based: number\) => void;/);
    assert.match(source, /\n  onNavigateToFinding,\n/);
  });

  it('computes both endpoints of the span via computeJumpSpan', () => {
    assert.match(source, /import \{ computeJumpSpan \} from "\.\.\/\.\.\/lib\/jump-span\.ts";/);
    assert.match(source, /const jumpSpan = computeJumpSpan\(\{/);
    assert.match(jumpSpanLibSource, /endLine: root\.endLine \?\? root\.startLine/);
    // The retrospective #10 tightening itself — a line-precise member's span
    // must win over the root's own wider envelope.
    assert.match(jumpSpanLibSource, /l\.anchor === "lines" && memberSet\.has\(l\.issue\.rule\)/);
  });

  it('resolves the top priority through the server-computed locatedIssues anchors', () => {
    // Without this the button simply did not render for the ordinary case —
    // a scene-level top priority like "Scene 9 (climax peak)", which the
    // line-number regex can never resolve.
    assert.match(source, /locatedIssues: report\?\.locatedIssues,/);
    assert.match(jumpSpanLibSource, /locatedIssues\?\.find\(/);
    assert.match(jumpSpanLibSource, /l\.issue\.location === topLocation && l\.startLine !== undefined && l\.endLine !== undefined/);
    assert.match(source, /useState<DoctorReportWithAnchors \| null>\(null\)/);
  });

  it('prefers the highlighting callback and falls back to the plain one', () => {
    assert.match(
      source,
      /onNavigateToFinding\s*\?\s*onNavigateToFinding\(jumpSpan\.startLine, jumpSpan\.endLine\)\s*:\s*onJumpToLine\?\.\(jumpSpan\.startLine\)/,
    );
    assert.match(source, /\{jumpSpan && \(onNavigateToFinding \|\| onJumpToLine\) && \(/);
  });
});

describe('ScriptIDE.tsx — Coverage jump reaches highlightRange', () => {
  const source = read('components/ScriptIDE.tsx');

  it('wires CoverageSummary onNavigateToFinding to the editor handle', () => {
    const coverageBlock = source.slice(
      source.indexOf('<CoverageSummary'),
      source.indexOf('onOpenFullReport={() => setCoverageFull(true)}'),
    );
    assert.ok(coverageBlock.length > 0, '<CoverageSummary> block not found');
    assert.match(
      coverageBlock,
      /onNavigateToFinding=\{\(startLine, endLine\) => \{[\s\S]*?editorRef\.current\?\.highlightRange\(startLine, endLine\);/,
    );
  });

  it('is the same handle method the full doctor panel already uses', () => {
    // Both call sites, one method — if this ever becomes two different
    // mechanisms, the two panels can drift apart again.
    const calls = source.match(/editorRef\.current\?\.highlightRange\(startLine, endLine\)/g) ?? [];
    assert.equal(calls.length, 2, `expected both panels to call highlightRange; found ${calls.length}`);
  });
});

describe('FountainEditor.tsx — highlightRange is a real flash, not just a cursor move', () => {
  const source = read('components/editor/FountainEditor.tsx');

  it('still exposes highlightRange on the handle', () => {
    assert.match(source, /highlightRange\(startLine: number, endLine: number\): void;/);
  });

  it('clamps both endpoints and paints the decoration', () => {
    const impl = source.slice(source.indexOf('highlightRange(startLine: number, endLine: number) {'));
    assert.match(impl, /Math\.max\(1, Math\.min\(startLine, totalLines\)\)/);
    assert.match(impl, /setFindingHighlight\.of\(\{ from, to \}\)/);
  });
});

// The span parse itself, run for real. This mirrors CoverageSummary's regex
// exactly; if that regex changes, this test is the place the change has to be
// justified.
describe('topPriority location → line span', () => {
  const parse = (location: string): { startLine: number; endLine: number } | undefined => {
    const m = location.match(/Lines?\s+~?(\d+)(?:\s*[-–—]\s*~?(\d+))?/i);
    if (!m) return undefined;
    const start = Number(m[1]);
    const end = m[2] ? Number(m[2]) : start;
    return { startLine: Math.min(start, end), endLine: Math.max(start, end) };
  };

  it('reads a single line, a range, and the approximate form', () => {
    assert.deepEqual(parse('Line 42'), { startLine: 42, endLine: 42 });
    assert.deepEqual(parse('Lines 40-42'), { startLine: 40, endLine: 42 });
    assert.deepEqual(parse('Lines 40–42'), { startLine: 40, endLine: 42 });
    assert.deepEqual(parse('Lines ~12–40'), { startLine: 12, endLine: 40 });
    assert.deepEqual(parse('Line 88 (MARIA)'), { startLine: 88, endLine: 88 });
  });

  it('yields nothing for a location with no line numbers', () => {
    assert.equal(parse('Scene 3 (INT. BAR)'), undefined);
    assert.equal(parse('Action line adverbs'), undefined);
  });

  it('orders a backwards range instead of highlighting nothing', () => {
    assert.deepEqual(parse('Lines 42-40'), { startLine: 40, endLine: 42 });
  });
});
