// Page/runtime estimate + excerpt-confidence caveat (Run 19 items).
// Conventions: node:test + assert/strict, matching tests/core/script-doctor.test.ts.
//
// Coverage, fire + no-fire per check:
//  - estimatePages: delegates to the real element-aware paginator
//    (src/lib/screenplay-layout.ts's layoutScreenplay, shared with the editor's
//    page chip), 1-page floor on any non-empty text, null on empty/whitespace.
//    It previously counted non-blank SOURCE lines at ~55 lines/page, which
//    under-reported every real screenplay by 2-3x — in Fountain source a whole
//    speech or action paragraph is ONE line however many lines it renders to.
//    See tests/core/page-estimate-realism.test.ts for the corpus-grounded
//    density check that pins the corrected behavior.
//  - excerptNoteFor: fires below the RECOMMEND scene floor (8), silent at and
//    above it — never padded onto full-length input.
//  - runScriptDoctor integration: non-degenerate reports carry both fields
//    consistently with the pure helpers; degenerate (empty) reports carry
//    neither a fabricated estimate nor a caveat about scenes it never saw.
//  - coverage HTML: estimate and caveat render; caveat is escaped/omitted
//    correctly (no-fire: long report shows no excerpt line).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor, estimatePages, excerptNoteFor } from '../../server/nvm/analyze/doctor.ts';
import { layoutScreenplay } from '../../src/lib/screenplay-layout.ts';

/** n scenes of identical, competent shape — enough text to be non-degenerate. */
function buildFountain(sceneCount: number): string {
  const parts: string[] = [];
  for (let i = 0; i < sceneCount; i++) {
    parts.push(
      `INT. LOCATION ${i + 1} - DAY`,
      '',
      'The room is quiet. A clock ticks against the far wall.',
      '',
      'ALEX',
      'We need to keep moving before they find us.',
      '',
      'JORDAN',
      'Then stop talking and help me lift this.',
      '',
    );
  }
  return parts.join('\n');
}

describe('estimatePages — pure helper', () => {
  it('fires: grows monotonically with script length, and agrees with the paginator', () => {
    // The old assertion here pinned the source-line formula (110 raw lines ===
    // exactly 2 pages). That formula was the bug: it ignored how elements wrap,
    // so it under-reported real screenplays by 2-3x. The real contract is that
    // the estimate IS the paginator's page count, and that longer scripts
    // produce more pages.
    const short = buildFountain(2);
    const long = buildFountain(20);

    const shortEst = estimatePages(short);
    const longEst = estimatePages(long);
    assert.ok(shortEst && longEst, 'non-empty text must produce an estimate');

    assert.equal(shortEst.pages, layoutScreenplay(short).length,
      'estimate must equal the paginator the editor renders from');
    assert.equal(longEst.pages, layoutScreenplay(long).length);

    assert.ok(longEst.pages > shortEst.pages,
      `a 20-scene script (${longEst.pages}pp) must exceed a 2-scene one (${shortEst.pages}pp)`);
    assert.equal(longEst.runtimeMinutes, longEst.pages, 'one page ~ one minute');
    assert.equal(longEst.basis, 'lines');
  });

  it('fires: floors at 1 page for any non-empty text (never 0 pages)', () => {
    const est = estimatePages('INT. ROOM - DAY\n\nA single line.');
    assert.ok(est);
    assert.equal(est.pages, 1);
    assert.equal(est.runtimeMinutes, 1);
  });

  it('no-fire: empty and whitespace-only input produce no estimate', () => {
    assert.equal(estimatePages(''), null);
    assert.equal(estimatePages('   \n\n \t \n'), null);
  });

  it('blank lines do not inflate the estimate (CRLF and LF treated alike)', () => {
    const dense = Array.from({ length: 55 }, (_, i) => `L${i}`).join('\n');
    const padded = Array.from({ length: 55 }, (_, i) => `L${i}`).join('\r\n\r\n\r\n');
    assert.equal(estimatePages(dense)!.pages, estimatePages(padded)!.pages);
  });
});

describe('excerptNoteFor — pure helper', () => {
  it('fires below the RECOMMEND scene floor, with the scene count named', () => {
    const note = excerptNoteFor(3);
    assert.ok(note, 'sub-floor scene counts must carry a caveat');
    assert.match(note, /excerpt/i);
    assert.match(note, /3 scenes/);
  });

  it('singularizes correctly for one scene', () => {
    assert.match(excerptNoteFor(1)!, /1 scene analyzed/);
  });

  it('no-fire: silent at and above the floor (never padded)', () => {
    assert.equal(excerptNoteFor(8), undefined);
    assert.equal(excerptNoteFor(40), undefined);
  });
});

describe('runScriptDoctor — pageEstimate + excerptNote integration', () => {
  it('short script: report carries both, consistent with the pure helpers', async () => {
    const fountain = buildFountain(3);
    const report = await runScriptDoctor(fountain);
    assert.deepEqual(report.pageEstimate, estimatePages(fountain));
    assert.equal(report.excerptNote, excerptNoteFor(report.sceneCount));
    assert.ok(report.excerptNote, 'a 3-scene script must carry the excerpt caveat');
  });

  it('long script: estimate present, caveat absent', async () => {
    const report = await runScriptDoctor(buildFountain(10));
    assert.ok(report.pageEstimate);
    assert.ok(report.pageEstimate.pages >= 1);
    assert.equal(report.pageEstimate.runtimeMinutes, report.pageEstimate.pages);
    assert.equal(report.excerptNote, undefined, 'full-length input must not carry the excerpt caveat');
  });

  it('degenerate empty input: no fabricated estimate, no caveat', async () => {
    const report = await runScriptDoctor('   \n\n  \t  ');
    assert.equal(report.pageEstimate, undefined);
    assert.equal(report.excerptNote, undefined);
  });
});

describe('coverage HTML — estimate and caveat render', () => {
  it('renders pages/runtime in the meta line and the caveat when present', async () => {
    const { renderCoverageHtml } = await import('../../server/lib/coverage-html.ts');
    const shortReport = await runScriptDoctor(buildFountain(3));
    const html = renderCoverageHtml(shortReport, 'Excerpt Test');
    assert.match(html, /page/i);
    assert.match(html, /min \(est\.\)/);
    assert.match(html, /reads like an excerpt/i);
  });

  it('no-fire: long report renders the estimate but no excerpt line', async () => {
    const { renderCoverageHtml } = await import('../../server/lib/coverage-html.ts');
    const longReport = await runScriptDoctor(buildFountain(10));
    const html = renderCoverageHtml(longReport, 'Feature Test');
    assert.match(html, /min \(est\.\)/);
    assert.doesNotMatch(html, /reads like an excerpt/i);
  });
});
