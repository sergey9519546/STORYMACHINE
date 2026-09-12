// ONE "things to fix first" list, four surfaces — adversarial finding #8.
//
// The defect: `server/lib/coverage-letter.ts` printed the heading
// `The 3 things to fix first` TWICE in one document, over two lists chosen by
// two different algorithms — the producer tier's
// `suppressContradictoryFindings(topPriorities).slice(0, 3)` (engine order,
// contradiction-filtered) and the body's
// `[...anchored, ...unanchored].slice(0, 3)` (location-anchored first, no
// filter). On `data/screenplays/runoff.fountain` the report's ONLY critical
// finding led page one and was absent from the body's three, so a writer
// working from the back of the letter never touched it; the same letter also
// disagreed with the coverage HTML exported from the same contentHash.
//
// WHAT THIS ASSERTS, and why each half is needed:
//
//  1. The pure contract of `server/lib/priority-selection.ts` — ordered,
//     suppression-filtered, prefix-sliced — over hand-built inputs, including
//     the case the slice order actually matters for (a suppressed finding
//     INSIDE the leading three: suppress-then-slice yields three findings,
//     slice-then-suppress yields two).
//  2. The real letter, rendered by the real renderer from a REAL doctor run on
//     the 231-scene feature fixture and on a short — the tier's list and the
//     body's list must be the same findings in the same order, the tier being a
//     prefix of the body. A synthetic report cannot prove this: the defect was
//     produced by an interaction between the engine's severity ranking and the
//     letter's location classifier, and only real findings carry both.
//
// FAIL-FIRST: on the pre-fix tree this file does not even load (the module it
// imports does not exist there); the behavioural half was reproduced first as a
// probe against a `git archive` checkout — see the lane report.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { orderedPriorities, leadingPriorities } from '../../server/lib/priority-selection.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { buildReaderTier, TIER_PRIORITY_COUNT } from '../../server/lib/reader-tier.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { buildRootCausePipeline } from '../../server/lib/root-cause-pipeline.ts';
import { prioritiesHeadingFor, prioritiesHeadingUpper } from '../../src/lib/priorities-copy.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

/** The two rules of `CONTRADICTORY_PAIRS` (server/nvm/analyze/prioritize.ts):
 *  PURPOSE_CLIMAX_ABSENT is dropped when PROTAGONIST_PASSIVITY_CLIMAX is also
 *  present. Used here to build an input where the suppressed finding sits INSIDE
 *  the leading three. */
function issue(rule: string, location: string, severity: 'critical' | 'major' | 'minor' = 'major') {
  return {
    rule,
    location,
    severity,
    description: `${rule} description`,
    pass: 'structure' as const,
  };
}

describe('priority-selection: one ordered, filtered list', () => {
  it('orderedPriorities preserves the engine order and drops the losing half of a fired pair', () => {
    const input = [
      issue('PROTAGONIST_PASSIVITY_CLIMAX', 'Scene 9 (climax peak)'),
      issue('PURPOSE_CLIMAX_ABSENT', 'Story structure — climax layer'),
      issue('WEAK_MIDPOINT', 'Scene 5 (midpoint)'),
    ];
    const out = orderedPriorities(input as never);
    assert.deepEqual(
      out.map(i => i.rule),
      ['PROTAGONIST_PASSIVITY_CLIMAX', 'WEAK_MIDPOINT'],
      'the document-anchored half is dropped; the rest keeps its order',
    );
  });

  it('orderedPriorities leaves a list with no fired pair completely untouched', () => {
    const input = [issue('A_RULE', 'Scene 1'), issue('B_RULE', 'Overall structure')];
    assert.deepEqual(orderedPriorities(input as never).map(i => i.rule), ['A_RULE', 'B_RULE']);
  });

  it('orderedPriorities tolerates an absent topPriorities field', () => {
    assert.deepEqual(orderedPriorities(undefined), []);
  });

  it('leadingPriorities suppresses BEFORE it slices — three findings, not two and a hole', () => {
    const input = [
      issue('PROTAGONIST_PASSIVITY_CLIMAX', 'Scene 9 (climax peak)'),
      issue('PURPOSE_CLIMAX_ABSENT', 'Story structure — climax layer'),
      issue('WEAK_MIDPOINT', 'Scene 5 (midpoint)'),
      issue('ACT1_BOUNDARY_WEAK', 'End of Act 1'),
    ];
    const three = leadingPriorities(input as never, 3);
    assert.equal(three.length, 3, 'slice-then-suppress would have returned 2');
    assert.deepEqual(
      three.map(i => i.rule),
      ['PROTAGONIST_PASSIVITY_CLIMAX', 'WEAK_MIDPOINT', 'ACT1_BOUNDARY_WEAK'],
    );
  });

  it('leadingPriorities never renders a list the full list does not start with', () => {
    const input = [issue('A', 'Scene 1'), issue('B', 'Scene 2'), issue('C', 'Scene 3')];
    const all = orderedPriorities(input as never);
    for (let n = 0; n <= all.length + 2; n++) {
      assert.deepEqual(
        leadingPriorities(input as never, n).map(i => i.rule),
        all.slice(0, n).map(i => i.rule),
        `a leading ${n} must be a prefix of the one list`,
      );
    }
    assert.deepEqual(leadingPriorities(input as never, -1), []);
    assert.deepEqual(leadingPriorities(input as never, Number.NaN), []);
  });
});

// ── The real documents ───────────────────────────────────────────────────────

interface Rendered {
  report: ScriptDoctorReport;
  markdown: string;
  text: string;
  html: string;
}

async function renderAll(fountain: string, title: string): Promise<Rendered> {
  const base = await runScriptDoctor(fountain);
  const { rootCauses } = buildRootCausePipeline(base, fountain);
  const report = { ...base, rootCauses };
  const letter = renderCoverageLetter(report, { title, fountain });
  return {
    report,
    markdown: letter.markdown,
    text: letter.text,
    html: renderCoverageHtml(report, title, { fountain }),
  };
}

/** Every `SEVERITY — location` heading under a priorities heading, in order.
 *  Read out of the RENDERED markdown rather than out of the data, because the
 *  defect was a rendering that disagreed with another rendering. */
function letterListsAfter(markdown: string, heading: string): string[][] {
  const lists: string[][] = [];
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].replace(/^#+\s*/, '').trim().startsWith(heading)) continue;
    const items: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const m = lines[j].match(/^\d+\.\s\*\*(.+?)\*\*/);
      if (m) { items.push(m[1].replace(/\s+—\s+p\.\s*\d+$/, '').trim()); continue; }
      if (/^#{1,6}\s/.test(lines[j]) || lines[j].trim() === '---') break;
    }
    lists.push(items);
  }
  return lists;
}

const CASES: Array<{ name: string; path: string }> = [
  { name: 'the 231-scene feature fixture', path: 'tests/fixtures/feature-length/assembled-feature.fountain' },
  { name: 'runoff (9 scenes)', path: 'data/screenplays/runoff.fountain' },
  { name: 'chain-of-custody (13 scenes)', path: 'data/screenplays/chain-of-custody.fountain' },
];

describe('the coverage letter prints ONE priorities list', () => {
  for (const testCase of CASES) {
    it(`${testCase.name}: the tier's list is a prefix of the body's, item for item`, async () => {
      const fountain = readFileSync(join(REPO, testCase.path), 'utf8');
      const { report, markdown, text } = await renderAll(fountain, testCase.name);

      const all = orderedPriorities(report.topPriorities);
      assert.ok(all.length > 0, 'the fixture must produce priorities for this test to mean anything');

      const tier = buildReaderTier(report, { fountain });
      const tierHeading = prioritiesHeadingFor(Math.min(all.length, TIER_PRIORITY_COUNT));
      const bodyHeading = prioritiesHeadingFor(all.length);

      // The tier's own data is the prefix.
      assert.deepEqual(
        tier.priorities.map(p => `${p.severity.toUpperCase()} — ${p.location}`),
        all.slice(0, TIER_PRIORITY_COUNT).map(i => `${i.severity.toUpperCase()} — ${i.location}`),
      );

      const tierList = letterListsAfter(markdown, tierHeading)[0];
      const bodyLists = letterListsAfter(markdown, bodyHeading);
      const bodyList = bodyLists[bodyLists.length - 1];

      assert.ok(tierList && tierList.length > 0, `no rendered list under "${tierHeading}"`);
      assert.ok(bodyList && bodyList.length > 0, `no rendered list under "${bodyHeading}"`);

      assert.deepEqual(
        bodyList,
        all.map(i => `${i.severity.toUpperCase()} — ${i.location}`),
        'the body renders the one list, whole and in order',
      );
      assert.deepEqual(
        tierList,
        bodyList.slice(0, tierList.length),
        'the tier renders a PREFIX of the body — same findings, same order',
      );

      // The defect in its own terms: the report's critical findings cannot be on
      // page one and missing from the body.
      const criticals = all.filter(i => i.severity === 'critical')
        .map(i => `CRITICAL — ${i.location}`);
      for (const c of criticals) {
        assert.ok(bodyList.includes(c), `the body's list drops ${c}`);
      }

      // The plain-text renderer states the same two counts.
      assert.ok(text.includes(prioritiesHeadingUpper(Math.min(all.length, TIER_PRIORITY_COUNT))));
      assert.ok(text.includes(prioritiesHeadingUpper(all.length)));
    });

    it(`${testCase.name}: the letter and the coverage HTML print the same list`, async () => {
      const fountain = readFileSync(join(REPO, testCase.path), 'utf8');
      const { report, markdown, html } = await renderAll(fountain, testCase.name);
      const all = orderedPriorities(report.topPriorities);

      const bodyLists = letterListsAfter(markdown, prioritiesHeadingFor(all.length));
      const bodyList = bodyLists[bodyLists.length - 1];

      // The HTML's own list, read out of the rendered document.
      const section = html.slice(html.indexOf(`<h2>${prioritiesHeadingFor(all.length)}</h2>`));
      const htmlLocations = [...section.matchAll(/<span class="issue-location">([^<]*)<\/span>/g)]
        .map(m => m[1]).slice(0, all.length);

      assert.deepEqual(
        htmlLocations,
        all.map(i => i.location.replace(/&/g, '&amp;')),
        'the HTML export renders the same findings in the same order',
      );
      assert.equal(bodyList.length, htmlLocations.length,
        'the two exported documents state the same count under the same heading');
    });
  }
});
