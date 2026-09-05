// POST /api/export/coverage — the shareable Script Doctor coverage-report
// HTML export. Conventions: node:test + assert/strict + startTestServer,
// matching tests/routes/scriptide-doctor.test.ts and tests/routes/export.test.ts.
//
// Coverage: the two-format DoctorBodySchema contract (valid fountain, valid
// fdx, both fields, neither field), the response envelope (200, text/html,
// attachment Content-Disposition with a filename), that the body carries a
// verdict and a "verification hash", and that a title containing angle
// brackets is HTML-escaped rather than injected verbatim into the exported
// document.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';

// Same shape of fixture as tests/routes/scriptide-doctor.test.ts: enough
// scenes/dialogue/characters for the 14 revision passes to have real
// material, so this exercises a non-degenerate report end to end.
const MULTI_SCENE_FOUNTAIN = `INT. WAREHOUSE - NIGHT

Rain hammers the tin roof. JAX crouches behind a stack of crates, a gun in his hand.

JAX
(whispering)
She said midnight. It's already past that.

MARA
We wait. If they're not here by dawn, we run.

JAX
I don't like waiting in the dark.

EXT. WAREHOUSE - CONTINUOUS

A truck's headlights sweep across the gravel lot. MARA watches through a cracked window.

MARA
Someone's here. Get down.

INT. WAREHOUSE - MOMENTS LATER

The door bursts open. A STRANGER steps inside, face hidden in shadow.

STRANGER
I know what you did.

JAX
That's not true.

STRANGER
You've been lying to her since the beginning.

MARA
Jax? What is he talking about?

EXT. HIGHWAY - DAWN

JAX and MARA run toward the car as the "SILVER KEY" catches the first light.

MARA
Just drive. We'll figure out the rest later.

JAX
I'm sorry. I should have told you everything.
`;

const MULTI_SCENE_FDX = fountainToFdx(MULTI_SCENE_FOUNTAIN, 'The Long Wait');

function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
}

describe('routes/export/coverage — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/export/coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('POST a valid Fountain body returns 200 text/html with an attachment filename and a rendered report', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));

    const disposition = res.headers.get('content-disposition') ?? '';
    assert.match(disposition, /attachment/);
    assert.match(disposition, /filename="[^"]*-coverage\.html"/);
    assert.match(disposition, /The(%20|\+)Long(%20|\+)Wait-coverage\.html/);

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /RECOMMEND|CONSIDER|PASS/, 'body must carry a coverage verdict');
    assert.match(html, /Script-text hash/i, 'body must carry the script-text hash footer');
    assert.ok(!/<script/i.test(html), 'export must not contain any <script> tag');
  });

  it('POST a valid Final Draft (.fdx) body returns 200 with a rendered report', async () => {
    const res = await post({ fdx: MULTI_SCENE_FDX, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type')?.startsWith('text/html'));

    const html = await res.text();
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.match(html, /RECOMMEND|CONSIDER|PASS/);
    assert.match(html, /Script-text hash/i);
  });

  it('POST a body with both fountain and fdx returns 400', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, fdx: MULTI_SCENE_FDX });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a body with neither fountain nor fdx returns 400', async () => {
    const res = await post({ title: 'Untitled' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /exactly one of fountain or fdx/);
  });

  it('POST a malformed fdx (no <Paragraph> elements) returns 400', async () => {
    const res = await post({ fdx: '<FinalDraft><Content></Content></FinalDraft>' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(typeof body.error === 'string' && body.error.length > 0);
  });

  // Attack-lane audit follow-up (fdx-conversion bypass) — see
  // tests/routes/scriptide-doctor.test.ts's own copy of this test for the
  // full rationale.
  it('POST an fdx whose converted Fountain has 1,600 distinct character cues is rejected fast, not analyzed', async () => {
    let fountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 1600; i++) fountain += `CHARACTER${i}\nLine.\n\n`;
    const fdx = fountainToFdx(fountain, 'Pathological');

    const start = Date.now();
    const res = await post({ fdx });
    const ms = Date.now() - start;
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /more than 1500 distinct all-caps character-cue-shaped lines/);
    // 1000ms, not 100ms — see tests/routes/scriptide-doctor.test.ts's own
    // copy of this test for why (measured `npm test` full-suite contention).
    assert.ok(ms < 1000, `expected a fast rejection (<1000ms), took ${ms}ms — the fdx-path guard may not be firing`);
  });

  it('POST an empty-string fountain returns 400 (zod .min(1))', async () => {
    const res = await post({ fountain: '' });
    assert.equal(res.status, 400);
  });

  it('refuses to export coverage from a scene-truncated partial analysis', async () => {
    const res = await post({ fountain: buildSceneTruncatedFountain(), title: 'Partial Draft' });
    assert.equal(res.status, 422);
    assert.ok(res.headers.get('content-type')?.startsWith('application/json'));
    const body = await res.json();
    assert.equal(body.error, 'analysis_incomplete');
    assert.match(body.message, /complete/i);
    assert.equal(body.health, undefined);
  });

  it('does not leak an unescaped title into the exported HTML', async () => {
    const maliciousTitle = '<b>Bad</b> Title <script>alert(1)</script>';
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: maliciousTitle });
    assert.equal(res.status, 200);

    const html = await res.text();
    assert.ok(!html.includes('<b>Bad</b>'), 'raw <b> tag from the title must not survive verbatim');
    assert.ok(!/<script>alert\(1\)<\/script>/.test(html), 'raw <script> tag from the title must not survive verbatim');
    assert.ok(!/<script/i.test(html), 'no <script> tag anywhere in the response');
    assert.ok(html.includes('&lt;b&gt;Bad&lt;/b&gt;'), 'the title must appear HTML-escaped rather than dropped');
  });

  // Pilot session 2026-08-07 finding #3: this route never attached rootCauses
  // to the report it fed renderCoverageHtml, so the exported document had
  // nothing to show even after coverage-html.ts grew a Root Causes section.
  // Cross-checks against POST /api/scriptide/doctor (which has attached
  // rootCauses at the route layer since before this fix) rather than
  // hardcoding an assumption about what this fixture clusters into, so the
  // test proves the two routes now agree instead of asserting a brittle
  // fixture-specific outcome.
  //
  // 2026-09-04 (advice-quality audit item 1): that single section is now
  // TWO — named findings under "Root Causes" (above Top Priorities) and
  // generic auto-titled clusters under "Recurring Issue Clusters" (below).
  // isBareHashId below applies cluster.ts's own isNamedRootCause id-shape
  // test client-side (the route response carries only the finding, not the
  // helper) so this assertion stays exact rather than degrading to "some
  // heading rendered".
  it('surfaces Root Causes / Recurring Issue Clusters exactly when the live doctor report would cluster them for the same script', async () => {
    const doctorRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: MULTI_SCENE_FOUNTAIN }),
    });
    assert.equal(doctorRes.status, 200);
    const doctorBody = await doctorRes.json() as { rootCauses?: Array<{ id: string }> };
    const rootCauses = doctorBody.rootCauses ?? [];
    const isBareHashId = (id: string) => /^[0-9a-f]{16}$/.test(id);
    const hasNamed = rootCauses.some(rc => !isBareHashId(rc.id));
    const hasGeneric = rootCauses.some(rc => isBareHashId(rc.id));

    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const html = await res.text();

    if (hasNamed) {
      assert.match(html, /<h2>Root Causes<\/h2>/, 'coverage export must surface Root Causes when the doctor would cluster a named finding for this script');
      assert.match(html, /Subsumes \d+ issue/);
    } else {
      assert.ok(!html.includes('<h2>Root Causes</h2>'), 'no Root Causes heading when nothing named clusters for this script');
    }
    if (hasGeneric) {
      assert.match(html, /<h2>Recurring Issue Clusters<\/h2>/, 'coverage export must surface Recurring Issue Clusters when the doctor would cluster a generic finding for this script');
    } else {
      assert.ok(!html.includes('<h2>Recurring Issue Clusters</h2>'), 'no Recurring Issue Clusters heading when nothing generic clusters for this script');
    }
  });

  // REVIEW FIX (rebase defect, 2026-09-05): DraftRank grew a second shape —
  // { rank: null, of: 0, unscored: N } for "N saved drafts have no score
  // yet" — and ScriptDoctorPanel.tsx's client-side export forwarded that
  // object to this route UNGUARDED before the fix (src/lib/
  // draft-rank-copy.ts's draftRankExportPayload). DraftRankSchema (server/
  // lib/validation.ts) requires `rank >= 1`, so a client still sending the
  // pre-fix shape would get a 400 where a writer used to get a download.
  // The fixed client never sends `draftRank` at all in that state (the same
  // way it always omitted the field before draftRank existed) — this proves
  // the route side of that contract: omitting draftRank (exactly what the
  // fixed client now does for an unscored draft) still exports cleanly, with
  // no rank line in the document.
  it('POST with no draftRank field (what the fixed client sends when every saved draft is unscored) returns 200 with no rank line', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait' });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(!html.includes('Rank among your drafts'), 'no draft-rank line when draftRank was never sent');
  });

  it('POST the pre-fix unranked shape ({ rank: null, ... }) is rejected by the schema, not silently accepted as "no rank"', async () => {
    const res = await post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', draftRank: { rank: null, of: 0, unscored: 5 } });
    assert.equal(res.status, 400, 'the schema must reject this shape outright — the fix is that the CLIENT never sends it, not that the server tolerates it');
  });

  it('POST a valid ranked draftRank renders the rank line', () => {
    return post({ fountain: MULTI_SCENE_FOUNTAIN, title: 'The Long Wait', draftRank: { rank: 2, of: 5 } })
      .then(async (res) => {
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.match(html, /Rank among your drafts:\s*2nd of 5/);
      });
  });
});
