// The exported documents and the in-app panel agree about every dimension —
// adversarial findings #4 and #14, export half.
//
// THE STATE THIS CLOSES. After the client lane, three surfaces said three
// different things about the same five numbers of one contentHash:
//
//   ScriptDoctorPanel.tsx     five gated badges + a gated section caption
//   coverage-html.ts          label / bar / score / summary / basis — NO badge
//   coverage-letter.ts        no dimension section at all
//
// So the reproduction in the finding ("TOP 10%" beside a dimension the same
// document's headline calls not comparable) was fixed on the writer's screen
// and invisible in the document a producer actually receives — and a producer
// reading the letter got the dimension scores only as a sentence inside the
// summary paragraph, with no ranking statement at all.
//
// WHAT THIS ASSERTS. Not "the export contains a badge" — the point is that
// there is no second formatter, so the assertion is EQUALITY against the shared
// helpers, per dimension, on both exported shapes, for real reports:
//
//   * the 231-scene feature fixture (out of bounds on scene count AND word
//     count — the case where every badge used to read "top 10%")
//   * runoff (9 scenes, inside the scene band, four times over the word band —
//     the draft that read "TOP 80%" beside a 98)
//
// plus an in-bounds report, synthesised by putting a real report's dimensions
// on a scene/word count inside the reference set's bounds, because no CC0
// script in this repository is inside them (0 of 20) and an assertion that only
// ever exercises the withheld path proves nothing about the shown one.
//
// The PANEL's half is source-level: it renders through React and cannot be
// asked for a string here, so what is checked is that it calls the same three
// functions with the same three arguments. A browser assertion over the live
// panel already exists (scripts/verify-p2-p3-surfaces.mjs, phase P3-dimbadge).
//
// FAIL-FIRST: on the pre-fix tree the export renders no badge and the letter
// has no dimensions section, so every parity case below fails there.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  dimensionPercentileBadgeFor, dimensionPercentileTooltipFor, dimensionPercentileCaptionFor,
} from '../../src/lib/percentile-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PANEL = join(REPO, 'src', 'components', 'scriptide', 'ScriptDoctorPanel.tsx');

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&mdash;/g, '—').replace(/&amp;/g, '&');
}

/** `{ label, badge, tooltip }` per dimension, read out of the rendered HTML. */
function htmlBadges(html: string): Array<{ label: string; badge: string; tooltip: string }> {
  const re = /<div class="dim-label">([\s\S]*?)<span class="dim-pct" title="([^"]*)">([\s\S]*?)<\/span><\/div>/g;
  return [...html.matchAll(re)].map(m => ({
    label: unescapeHtml(m[1]),
    tooltip: unescapeHtml(m[2]),
    badge: unescapeHtml(m[3]),
  }));
}

/** `{ label, score, badge }` per dimension, read out of the rendered markdown. */
function letterBadges(markdown: string): Array<{ label: string; score: number; badge: string }> {
  const section = markdown.slice(markdown.indexOf('## Craft Dimensions'));
  const end = section.indexOf('\n## ', 4);
  const body = end < 0 ? section : section.slice(0, end);
  return [...body.matchAll(/^- \*\*(.+?) — (\d+)\/100 — (.+?)\*\* — /gm)]
    .map(m => ({ label: m[1], score: Number(m[2]), badge: m[3] }));
}

interface Case { name: string; report: ScriptDoctorReport; fountain: string }

async function realCase(name: string, relPath: string): Promise<Case> {
  const fountain = readFileSync(join(REPO, relPath), 'utf8');
  return { name, report: await runScriptDoctor(fountain), fountain };
}

function assertParity(c: Case) {
  const { report, fountain } = c;
  const dims = report.dimensions ?? [];
  assert.ok(dims.length === 5, `${c.name}: expected five dimensions, got ${dims.length}`);
  assert.ok(
    dims.every(d => typeof d.percentile === 'number'),
    `${c.name}: every dimension must carry a percentile, or this test proves nothing`,
  );

  const html = renderCoverageHtml(report, c.name, { fountain });
  const { markdown, text } = renderCoverageLetter(report, { title: c.name, fountain });

  const inHtml = htmlBadges(html);
  const inLetter = letterBadges(markdown);
  assert.equal(inHtml.length, dims.length, `${c.name}: the HTML must badge every dimension`);
  assert.equal(inLetter.length, dims.length, `${c.name}: the letter must badge every dimension`);

  dims.forEach((dim, i) => {
    const expectedBadge = dimensionPercentileBadgeFor(
      dim.percentile as number, report.sceneCount, report.wordCount,
    );
    const expectedTooltip = dimensionPercentileTooltipFor(
      dim.percentile as number, dim.label, report.sceneCount, report.wordCount,
    );

    assert.equal(inHtml[i].label, dim.label, `${c.name}: HTML dimension ${i} order`);
    assert.equal(inHtml[i].badge, expectedBadge,
      `${c.name}: the HTML badge for ${dim.label} is not the shared helper's output`);
    assert.equal(inHtml[i].tooltip, expectedTooltip,
      `${c.name}: the HTML tooltip for ${dim.label} is not the shared helper's output`);

    assert.equal(inLetter[i].label, dim.label, `${c.name}: letter dimension ${i} order`);
    assert.equal(inLetter[i].badge, expectedBadge,
      `${c.name}: the letter badge for ${dim.label} disagrees with the HTML`);
    assert.equal(inLetter[i].score, Math.round(dim.score),
      `${c.name}: the letter states a different score for ${dim.label}`);

    // The plain-text letter states the same thing as the markdown one.
    assert.ok(
      text.includes(`${dim.label} — ${Math.round(dim.score)}/100 — ${expectedBadge}`),
      `${c.name}: the plain-text letter disagrees about ${dim.label}`,
    );
  });

  // The section caption, in all three shapes, from the one helper.
  const caption = dimensionPercentileCaptionFor(report.sceneCount, report.wordCount);
  assert.ok(html.includes(`<p class="dim-pct-caption">${caption
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    || unescapeHtml(html).includes(caption),
  `${c.name}: the HTML section caption is not the shared helper's output`);
  assert.ok(markdown.includes(caption), `${c.name}: the letter markdown caption differs`);
  assert.ok(text.includes(caption), `${c.name}: the plain-text letter caption differs`);
}

describe('HTML, letter and panel agree on every dimension', () => {
  it('the 231-scene feature fixture', async () => {
    assertParity(await realCase(
      'The Long Way Down', 'tests/fixtures/feature-length/assembled-feature.fountain',
    ));
  });

  it('runoff — the draft whose badge read "TOP 80%" next to a 98', async () => {
    const c = await realCase('Runoff', 'data/screenplays/runoff.fountain');
    assertParity(c);
    // The finding's own reading: no badge on this draft may be a band, because
    // the same document's headline says the draft is not comparable.
    const html = renderCoverageHtml(c.report, c.name, { fountain: c.fountain });
    for (const badge of htmlBadges(html)) {
      assert.equal(badge.badge, 'not comparable');
      assert.ok(!/top \d+%/i.test(badge.badge));
    }
  });

  it('an IN-BOUNDS report: the badge is a band, and all three surfaces state it', async () => {
    // No CC0 script in this repository is inside the reference set's bounds
    // (measured: 0 of 20), so the shown path has to be constructed. Only the
    // scene/word counts move — the dimensions, their scores and their
    // percentiles are a real doctor run's.
    const base = await realCase('Runoff', 'data/screenplays/runoff.fountain');
    const report: ScriptDoctorReport = { ...base.report, sceneCount: 9, wordCount: 300 };
    assertParity({ name: 'in-bounds', report, fountain: base.fountain });

    const html = renderCoverageHtml(report, 'in-bounds', { fountain: base.fountain });
    const badges = htmlBadges(html);
    assert.ok(badges.every(b => b.badge !== 'not comparable'),
      'an in-bounds draft must get real bands, or the gate is stuck shut');
    // #14's half: the badge vocabulary is the direction-safe one. "top 80%" —
    // percentileBand's output for a 20th-percentile dimension, and literally
    // true — cannot be produced by this grammar at all, which is the fix.
    for (const b of badges) {
      assert.match(
        b.badge,
        /^(?:top 10%|bottom 10%|bottom quartile|stronger than \d{1,2}%)$/,
        `"${b.badge}" is outside the direction-safe band vocabulary`,
      );
    }
    // The tooltip names the statistic that was ranked — the reason a 100/100 can
    // sit beside a low band without the row being unreadable.
    for (const b of badges) {
      assert.match(b.tooltip, /unclamped craft statistic/);
    }
  });

  it('a report with no dimension percentiles renders no badge and no caption', async () => {
    const base = await realCase('Runoff', 'data/screenplays/runoff.fountain');
    const report: ScriptDoctorReport = {
      ...base.report,
      dimensions: (base.report.dimensions ?? []).map(({ percentile, percentileDescriptor, ...rest }) => rest),
    };
    const html = renderCoverageHtml(report, 'no-pct', { fountain: base.fountain });
    const { markdown } = renderCoverageLetter(report, { title: 'no-pct', fountain: base.fountain });
    assert.equal(htmlBadges(html).length, 0);
    // The rendered element, not the class name: the stylesheet always carries a
    // `.dim-pct-caption` rule, so a bare substring test passes on every report.
    assert.ok(!html.includes('<p class="dim-pct-caption">'),
      'no caption may promise a comparison for badges that are not rendered');
    assert.ok(markdown.includes('## Craft Dimensions'), 'the dimensions still render, unranked');
    assert.ok(!markdown.includes('Percentile badges compare against'));
    assert.ok(!markdown.includes('No percentile badges:'));
  });
});

describe('no surface keeps a second dimension-badge formatter', () => {
  const files = [
    'server/lib/coverage-html.ts',
    'server/lib/coverage-letter.ts',
    'src/components/scriptide/ScriptDoctorPanel.tsx',
  ];

  for (const file of files) {
    it(`${file} calls the shared helpers, never the ungated band`, () => {
      const src = readFileSync(join(REPO, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '');
      assert.ok(src.includes('dimensionPercentileBadgeFor'),
        `${file} must render the badge through the shared gated helper`);
      assert.ok(!/\bdimensionPercentileBand\(/.test(src),
        `${file} calls the UNGATED band directly`);
      assert.ok(!/\bpercentileBand\(/.test(src),
        `${file} calls percentileBand — the direction-unsafe vocabulary of finding #14`);
    });
  }

  it('the panel passes the report\'s own scene and word counts, like both exports', () => {
    const src = readFileSync(PANEL, 'utf8');
    assert.match(
      src,
      /dimensionPercentileBadgeFor\(\s*dim\.percentile,\s*report\.sceneCount,\s*report\.wordCount,\s*\)/,
    );
    assert.match(
      src,
      /dimensionPercentileTooltipFor\(\s*dim\.percentile,\s*dim\.label,\s*report\.sceneCount,\s*report\.wordCount,\s*\)/,
    );
    assert.match(src, /dimensionPercentileCaptionFor\(report\.sceneCount, report\.wordCount\)/);
  });
});
