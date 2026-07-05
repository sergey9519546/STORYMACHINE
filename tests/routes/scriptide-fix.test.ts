// HTTP behavior for POST /api/scriptide/fix (Run 11's fix-and-verify).
// Mirrors tests/routes/game-interview.test.ts's ai.ts provider-mock idiom
// (setLLMProvider/resetLLMProvider) and tests/routes/scriptide-doctor.test.ts's
// fixture style, applied to the fix.ts seam instead. The doctor cache is
// cleared before every test (same rationale as scriptide-doctor-deep.test.ts's
// file header) so a mocked-provider run can never leak a cached report into
// a keyless test purely because of fixture/content-hash reuse.
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, type TestServer } from './helpers.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import { clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

// Same DIALOGUE_QUESTION_FLOOD fixture as tests/core/fix-verify.test.ts,
// verified there (via runScriptDoctor directly) to fire that rule at the
// whole-document location "Dialogue throughout" and to clear it under the
// VALID_REPLACEMENT span rewrite below.
const QUESTION_SCENE = `INT. OFFICE - DAY

JAX
Where is she?

JAX
Why would she leave now?

JAX
What if she's already gone?

JAX
Did you check the garage?

JAX
Is the car still there?

JAX
Should we call the police?

JAX
Do you have her number?

JAX
Can you try again?

JAX
What did she say last?

JAX
Where would she go?

MARA
I don't know.

MARA
She never said anything to me.

MARA
This is not making sense.

MARA
We should leave now.
`;

const PADDING = `
EXT. CITY STREET - MORNING

The sun rises over a quiet street. A delivery truck idles at the curb while a shopkeeper sweeps the sidewalk in front of a small bakery.

JAX walks past, hands in his pockets, glancing at his phone.

INT. APARTMENT - LATER

JAX sits at a cluttered desk covered in old photographs and a half-empty coffee cup. He rubs his eyes and stares at a phone that refuses to ring.

MARA

I told him this would happen eventually.

JAX

I know. I should have listened sooner.

INT. STAIRWELL - CONTINUOUS

Footsteps echo down the concrete stairwell. JAX descends two at a time, breathing hard, his coat catching on the railing.

EXT. PARKING GARAGE - NIGHT

Rows of parked cars sit under flickering fluorescent lights. JAX moves between them, checking each row methodically.

MARA

Maybe she went to her sister's place.

JAX

I already called there twice.
`;

const FOUNTAIN = QUESTION_SCENE + PADDING;
const SPAN = { startLine: 3, endLine: 25 };
const ISSUES = [{
  rule: 'DIALOGUE_QUESTION_FLOOD',
  description: '10 of 14 dialogue lines end with a question mark — more than a third of all dialogue is interrogative.',
  suggestedFix: 'Recast most of these questions as declarative statements.',
}];

const VALID_REPLACEMENT = `JAX
She left before dawn.

JAX
She said she needed air.

JAX
She might already be at the station.

JAX
I already checked the garage.

JAX
The car is gone too.

JAX
We should call the police now.

JAX
I have her number saved here.

JAX
I already tried her twice.`;

describe('routes/scriptide/fix — HTTP behavior', async () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });
  beforeEach(() => { clearDoctorCache(); });

  const post = (body: unknown) => fetch(`${server.baseUrl}/api/scriptide/fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('keyless: returns 200 with the honest usedLLM:false shape and no candidate', async () => {
    const res = await post({ fountain: FOUNTAIN, span: SPAN, issues: ISSUES });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.usedLLM, false);
    assert.equal(typeof body.note, 'string');
    assert.ok(body.note.length > 0);
    assert.equal('candidateFountain' in body, false);
    assert.equal('cleared' in body, false);
    assert.equal('introduced' in body, false);
  });

  it('mocked provider (ai.ts seam): a valid rewrite yields 200 with a full receipt', async () => {
    setLLMProvider({ generate: async () => ({ text: VALID_REPLACEMENT } as never) });
    try {
      const res = await post({ fountain: FOUNTAIN, span: SPAN, issues: ISSUES });
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.equal(body.usedLLM, true);
      assert.equal('note' in body, false);
      assert.equal(typeof body.candidateFountain, 'string');
      assert.equal(body.spanReplacement, VALID_REPLACEMENT);
      assert.deepEqual(body.span, SPAN);

      assert.equal(typeof body.before.health, 'number');
      assert.equal(typeof body.after.health, 'number');
      assert.equal(typeof body.before.contentHash, 'string');
      assert.equal(typeof body.after.contentHash, 'string');
      assert.notEqual(body.before.contentHash, body.after.contentHash);

      assert.ok(Array.isArray(body.cleared));
      assert.ok(Array.isArray(body.introduced));
      assert.ok(
        body.cleared.some((i: { rule: string }) => i.rule === 'DIALOGUE_QUESTION_FLOOD'),
        `expected DIALOGUE_QUESTION_FLOOD in cleared, got: ${JSON.stringify(body.cleared)}`,
      );

      // The receipt is reproducible: re-POSTing the candidate to /doctor
      // yields the exact same health and contentHash this route reported.
      const verifyRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fountain: body.candidateFountain }),
      });
      const verifyBody = await verifyRes.json();
      assert.equal(verifyBody.health, body.after.health);
      assert.equal(verifyBody.contentHash, body.after.contentHash);
    } finally {
      resetLLMProvider();
    }
  });

  it('400 on a malformed span (endLine < startLine)', async () => {
    const res = await post({ fountain: FOUNTAIN, span: { startLine: 10, endLine: 5 }, issues: ISSUES });
    assert.equal(res.status, 400);
  });

  it('400 on a malformed span (missing startLine)', async () => {
    const res = await post({ fountain: FOUNTAIN, span: { endLine: 5 }, issues: ISSUES });
    assert.equal(res.status, 400);
  });

  it('400 on empty issues array', async () => {
    const res = await post({ fountain: FOUNTAIN, span: SPAN, issues: [] });
    assert.equal(res.status, 400);
  });

  it('400 on more than 10 issues', async () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => ({ rule: `RULE_${i}`, description: 'x' }));
    const res = await post({ fountain: FOUNTAIN, span: SPAN, issues: tooMany });
    assert.equal(res.status, 400);
  });

  it('400 on an oversized issue field (rule > 80 chars)', async () => {
    const res = await post({ fountain: FOUNTAIN, span: SPAN, issues: [{ rule: 'x'.repeat(81), description: 'y' }] });
    assert.equal(res.status, 400);
  });

  it('400 on a missing fountain field', async () => {
    const res = await post({ span: SPAN, issues: ISSUES });
    assert.equal(res.status, 400);
  });

  it('400 on an empty-string fountain', async () => {
    const res = await post({ fountain: '', span: SPAN, issues: ISSUES });
    assert.equal(res.status, 400);
  });
});
