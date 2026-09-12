// Every "see …" reference in an exported report resolves — adversarial finding
// #16.
//
// THE DEFECT. The exported coverage HTML told its reader:
//
//   "The 16 findings below cluster the detailed issue list by where they land
//    in the script — read after Top Priorities, alongside the full appendix."
//
// The 2026-09-11 heading consolidation renamed that section.
// `grep -c "Top Priorities" RUNOFF.coverage.html` returned 1, and that one
// occurrence WAS the cross-reference: the document pointed at a heading it did
// not contain.
//
// WHAT THIS ASSERTS. Not "the old phrase is gone" — that is a single string a
// future rewording walks straight past. Every cross-reference is rendered as
// `<span class="xref">…</span>` by `server/lib/report-sections.ts`, so the
// property checked here is structural and total:
//
//   for every rendered report, every .xref names a heading THAT report rendered.
//
// Driven over four shapes that differ in which sections exist at all, because a
// dangling reference is most likely where a section is conditional: the
// 231-scene fixture (every section), a 9-scene short, a report with NO root
// causes (neither the Root Causes nor the Recurring Issue Clusters section
// renders, so a reference from one of them cannot dangle — and a reference TO
// them from elsewhere would), and a report with exactly one priority (the
// heading is "Fix this first", with no numeral, so a reference computed from a
// different count names nothing).
//
// Plus the cross-DOCUMENT reference: the coverage letter points a reader at the
// exported HTML's "Structural Signals" strip by name, and that name has to be
// the heading the HTML renders.
//
// FAIL-FIRST: `server/lib/report-sections.ts` does not exist on the pre-fix
// tree; copying it in and running this file there fails the resolution cases —
// see the lane report's fail-first log.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  REPORT_SECTION, sectionXrefHtml, xrefTitlesIn, headingTitlesIn,
} from '../../server/lib/report-sections.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { buildRootCausePipeline } from '../../server/lib/root-cause-pipeline.ts';
import { orderedPriorities } from '../../server/lib/priority-selection.ts';
import { prioritiesHeadingFor } from '../../src/lib/priorities-copy.ts';
import { STRENGTHS_SECTION_TITLE } from '../../server/lib/strengths-copy.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&mdash;/g, '—').replace(/&amp;/g, '&');
}

/** The one assertion this file exists for. */
function assertEveryXrefResolves(html: string, label: string): number {
  const refs = xrefTitlesIn(html).map(unescapeHtml);
  const headings = headingTitlesIn(html).map(unescapeHtml);
  for (const ref of refs) {
    assert.ok(
      headings.includes(ref),
      `${label}: the report points at "${ref}", which is not one of its own headings `
      + `(${headings.map(h => `"${h}"`).join(', ')})`,
    );
  }
  return refs.length;
}

describe('report-sections: the xref formatter and its inverse', () => {
  it('round-trips a title through the marker the checker reads', () => {
    const html = sectionXrefHtml(REPORT_SECTION.fullPassAppendix, s => s);
    assert.deepEqual(xrefTitlesIn(html), [REPORT_SECTION.fullPassAppendix]);
  });

  it('escapes the title with the escaper it is handed, never its own', () => {
    const html = sectionXrefHtml('A & B', s => s.replace(/&/g, '&amp;'));
    assert.equal(html, '<span class="xref">A &amp; B</span>');
  });

  it('a heading carrying a badge span still reads back as its plain title', () => {
    const heading = `<h2>${REPORT_SECTION.structuralAnalysis} <span class="diagnostic-badge">X</span></h2>`;
    assert.deepEqual(headingTitlesIn(heading), [REPORT_SECTION.structuralAnalysis]);
  });
});

describe('every cross-reference in the exported coverage HTML resolves', () => {
  async function renderReal(relPath: string, title: string) {
    const fountain = readFileSync(join(REPO, relPath), 'utf8');
    const base = await runScriptDoctor(fountain);
    const { rootCauses } = buildRootCausePipeline(base, fountain);
    const report = { ...base, rootCauses };
    return { report, html: renderCoverageHtml(report, title, { fountain }), fountain };
  }

  it('the 231-scene feature fixture: every reference names a heading it rendered', async () => {
    const { html } = await renderReal(
      'tests/fixtures/feature-length/assembled-feature.fountain', 'The Long Way Down',
    );
    const count = assertEveryXrefResolves(html, 'feature fixture');
    assert.ok(count >= 2, `expected the clustered-findings references to render, found ${count}`);
    // The defect in its own terms: the retired heading appears nowhere at all.
    assert.equal(html.includes('Top Priorities'), false,
      'the renamed heading must not survive as a reference');
  });

  it('runoff (9 scenes): the same, and the reference states the count the heading states', async () => {
    const { report, html } = await renderReal('data/screenplays/runoff.fountain', 'Runoff');
    assertEveryXrefResolves(html, 'runoff');

    const expected = prioritiesHeadingFor(orderedPriorities(report.topPriorities).length);
    const refs = xrefTitlesIn(html).map(unescapeHtml);
    assert.ok(refs.includes(expected),
      `the cross-reference must name "${expected}" — the heading this document printed`);
    assert.ok(headingTitlesIn(html).map(unescapeHtml).includes(expected));
  });

  it('a report with NO root causes renders no dangling reference', async () => {
    const fountain = readFileSync(join(REPO, 'data/screenplays/runoff.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    // No rootCauses attached at all — both sections that carry a reference are
    // omitted, so the document must contain no .xref rather than an unresolvable
    // one.
    const html = renderCoverageHtml(report, 'Runoff', { fountain });
    assert.equal(assertEveryXrefResolves(html, 'no-root-causes'), 0);
  });

  it('a one-priority report: the reference reads "Fix this first", not a numeral', async () => {
    const fountain = readFileSync(join(REPO, 'data/screenplays/runoff.fountain'), 'utf8');
    const base = await runScriptDoctor(fountain);
    const { rootCauses } = buildRootCausePipeline(base, fountain);
    const report: ScriptDoctorReport = {
      ...base,
      rootCauses,
      topPriorities: base.topPriorities.slice(0, 1),
    };
    const html = renderCoverageHtml(report, 'Runoff', { fountain });
    assertEveryXrefResolves(html, 'one-priority');
    const refs = xrefTitlesIn(html).map(unescapeHtml);
    assert.ok(refs.includes('Fix this first'),
      `expected the singular heading to be referenced, got ${JSON.stringify(refs)}`);
  });

  it('every section title the module names is a heading the full report renders', async () => {
    const { html } = await renderReal(
      'tests/fixtures/feature-length/assembled-feature.fountain', 'The Long Way Down',
    );
    const headings = headingTitlesIn(html).map(unescapeHtml);
    for (const title of Object.values(REPORT_SECTION)) {
      assert.ok(headings.includes(title),
        `"${title}" is named in report-sections.ts but never rendered — a dead title`);
    }
    assert.ok(headings.includes(STRENGTHS_SECTION_TITLE));
  });
});

describe('the coverage letter names the HTML section it points at', () => {
  it('the "Structural Signals" reference is the heading the HTML actually renders', async () => {
    const fountain = readFileSync(join(REPO, 'data/screenplays/runoff.fountain'), 'utf8');
    const base = await runScriptDoctor(fountain);
    assert.ok(base.structuralSignals?.scored,
      'the fixture must carry a scored structuralSignals block for this reference to render');

    const { rootCauses } = buildRootCausePipeline(base, fountain);
    const report = { ...base, rootCauses };
    const { markdown, text } = renderCoverageLetter(report, { title: 'Runoff', fountain });
    const html = renderCoverageHtml(report, 'Runoff', { fountain });
    const headings = headingTitlesIn(html).map(unescapeHtml);

    for (const [name, doc] of [['markdown', markdown], ['text', text]] as const) {
      const quoted = doc.match(/carries a new "([^"]+)" strip/);
      assert.ok(quoted, `the ${name} letter must carry the shape-and-rhythm sentence`);
      assert.ok(
        headings.includes(quoted[1]),
        `the ${name} letter points at "${quoted[1]}", which the exported HTML does not head`,
      );
    }
  });
});

describe('no renderer hand-types a section title', () => {
  // Source-level, so this RUNS on the pre-fix tree. A title spelled out in a
  // renderer is the mechanism of the whole finding: the reference and the
  // heading drift apart because they are two strings.
  const FILES = [
    'server/lib/coverage-html.ts',
    'server/lib/coverage-letter.ts',
    'server/lib/reader-tier.ts',
  ];

  /** Source with block and line comments removed — a title named in a comment is
   *  documentation, not a rendering. */
  function code(relPath: string): string {
    return readFileSync(join(REPO, relPath), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
  }

  for (const file of FILES) {
    it(`${file} spells no section title as a literal`, () => {
      const src = code(file);
      for (const title of Object.values(REPORT_SECTION)) {
        assert.ok(
          !src.includes(title),
          `${file} hand-types "${title}" — it must come from server/lib/report-sections.ts`,
        );
      }
      assert.ok(
        !src.includes('Top Priorities'),
        `${file} still names the retired "Top Priorities" heading`,
      );
    });
  }
});
