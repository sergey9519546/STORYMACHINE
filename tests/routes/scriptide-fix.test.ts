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
    // Shape & rhythm (2026-09-04, revised by the 2026-09-04 audit): no
    // candidate means no DELTA — `after` is absent rather than fabricated or
    // zeroed — but the BASELINE reading of the draft the writer is looking at
    // is still a true thing to report, so `before` goes out on its own.
    assert.equal(typeof body.structuralSignals, 'object');
    assert.equal(typeof body.structuralSignals.before.meanAbsDialogueShareDelta, 'number');
    assert.equal(typeof body.structuralSignals.before.actionSentenceCvOverall, 'number');
    assert.equal('after' in body.structuralSignals, false, 'no candidate means no after-side reading');
  });

  it('keyless: the baseline-only reading matches what /doctor reports for the same text', async () => {
    // Not a new number invented for this receipt — the same aggregates the
    // Shape & Rhythm section of the report already shows for this draft.
    const fixRes = await post({ fountain: FOUNTAIN, span: SPAN, issues: ISSUES });
    const fixBody = await fixRes.json();
    const doctorRes = await fetch(`${server.baseUrl}/api/scriptide/doctor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain: FOUNTAIN }),
    });
    const doctorBody = await doctorRes.json();
    assert.equal(
      fixBody.structuralSignals.before.meanAbsDialogueShareDelta,
      doctorBody.structuralSignals.meanAbsDialogueShareDelta,
    );
    assert.equal(
      fixBody.structuralSignals.before.actionSentenceCvOverall,
      doctorBody.structuralSignals.actionSentenceCvOverall,
    );
  });

  // Shape & rhythm delta (2026-09-04) — "field absent" path #2: a valid
  // rewrite on a document that never reaches the 2-scene floor
  // structural-signals.ts requires to score. The receipt (before/after
  // health, cleared/introduced) still renders in full; only the additive
  // structuralSignals field is missing.
  it('mocked provider, single-scene document: full receipt, but no structuralSignals (unscored on both sides)', async () => {
    const singleScene = 'INT. ROOM - DAY\n\nJAX\nHello there, is anyone home right now.\n';
    const span = { startLine: 4, endLine: 4 };
    const replacement = 'Hi, is anyone home right now.';
    setLLMProvider({ generate: async () => ({ text: replacement } as never) });
    try {
      const res = await post({
        fountain: singleScene,
        span,
        issues: [{ rule: 'VOICE_FLAT', description: 'This line reads flat.' }],
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.usedLLM, true);
      assert.equal(typeof body.candidateFountain, 'string');
      assert.equal(typeof body.before.health, 'number');
      assert.equal(typeof body.after.health, 'number');
      assert.equal('structuralSignals' in body, false, 'a single-scene document never scores structural signals — not even a baseline-only reading');
    } finally {
      resetLLMProvider();
    }
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

      // Shape & rhythm delta (2026-09-04, advisory only) — a SEPARATE
      // top-level field alongside `before`/`after`, present here because
      // FOUNTAIN carries 3 scenes on both sides of the fix (>= the 2-scene
      // floor structural-signals.ts requires to score). Never folded into
      // `before`/`after` themselves — those stay exactly the shape asserted
      // above (types.ts's FixVerifyResult contract, untouched).
      assert.equal(typeof body.structuralSignals, 'object');
      assert.equal(typeof body.structuralSignals.before.meanAbsDialogueShareDelta, 'number');
      assert.equal(typeof body.structuralSignals.before.actionSentenceCvOverall, 'number');
      assert.equal(typeof body.structuralSignals.after.meanAbsDialogueShareDelta, 'number');
      assert.equal(typeof body.structuralSignals.after.actionSentenceCvOverall, 'number');

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

  // ── Writer-supplied candidate (2026-09-04) ────────────────────────────────
  // The keyless half of this route: the writer rewrote the draft themselves
  // and POSTs it as `candidateFountain`. No span, no issues, no model. This
  // is the only path a keyless deploy — the product's front door — can reach,
  // and before it existed the receipt's whole render path was unreachable
  // there (adversarial audit, 2026-09-04).
  //
  // WRITER_CANDIDATE is the exact document the GENERATED path produces from
  // VALID_REPLACEMENT above (the same span, the same splice), which is what
  // lets the parity test below compare the two receipts field for field.
  const spliceSpan = (text: string, span: { startLine: number; endLine: number }, replacement: string) => {
    const lines = text.split('\n');
    return [
      ...lines.slice(0, span.startLine - 1),
      ...replacement.split('\n'),
      ...lines.slice(span.endLine),
    ].join('\n');
  };
  const WRITER_CANDIDATE = spliceSpan(FOUNTAIN, SPAN, VALID_REPLACEMENT);

  it('writer-supplied candidate: 200 with the full receipt, usedLLM:false, source:"writer"', async () => {
    // A COUNTING provider, not a throwing one (review finding, 2026-09-04).
    // A throwing provider proves only that this path does not DEPEND on model
    // output — it cannot see a call whose failure is swallowed, which is
    // exactly the shape fixAndVerify has (its catch turns any provider failure
    // into the keyless result). Planting a real `await fixAndVerify(...)`
    // inside a try/catch at the top of the route's candidate branch left every
    // assertion here green. A counter sees that call, so this guard can now
    // fail on the input it exists to catch — and it is what
    // docs/CLAIMS_REGISTER.md rows 46/47 ("no AI, no key needed", "No AI was
    // used") actually rest on.
    let modelCalls = 0;
    setLLMProvider({
      generate: async () => {
        modelCalls += 1;
        // Return successfully rather than throwing: a swallowed rejection is
        // indistinguishable from no call at all, which is the hole.
        return { text: 'A MODEL REPLY THE WRITER PATH MUST NEVER ASK FOR.' } as never;
      },
    });
    try {
      const res = await post({ fountain: FOUNTAIN, candidateFountain: WRITER_CANDIDATE });
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.equal(
        modelCalls,
        0,
        `the writer path must reach no model at all, but the provider was invoked ${modelCalls} time(s)`,
      );
      assert.equal(body.usedLLM, false, 'nothing was generated, so usedLLM stays honestly false');
      assert.equal(body.source, 'writer');
      assert.equal('note' in body, false, 'a real candidate carries no "no candidate" note');
      assert.equal(body.candidateFountain, WRITER_CANDIDATE);
      // No span/spanReplacement: this is a whole-document candidate.
      assert.equal('span' in body, false);
      assert.equal('spanReplacement' in body, false);

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

      // The descriptive shape-&-rhythm aggregates ride along on this path too
      // (3 scenes on both sides, so both score) — the writer sees the same
      // "not part of the score" strip a generated fix's receipt shows.
      assert.equal(typeof body.structuralSignals, 'object');
      assert.equal(typeof body.structuralSignals.before.meanAbsDialogueShareDelta, 'number');
      assert.equal(typeof body.structuralSignals.after.actionSentenceCvOverall, 'number');

      // Reproducible: re-POSTing the candidate to /doctor yields byte-identical
      // numbers, exactly as it does for a generated candidate.
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

  it('writer-supplied candidate: the receipt is the SAME one the generated path returns for the same candidate', async () => {
    // One implementation of "what changed" (server/nvm/analyze/fix-delta.ts),
    // proven behaviourally rather than by inspection: generate the candidate
    // through the LLM path, then verify the identical text through the writer
    // path, and require every verified field to match.
    setLLMProvider({ generate: async () => ({ text: VALID_REPLACEMENT } as never) });
    let generated: Record<string, unknown>;
    try {
      const genRes = await post({ fountain: FOUNTAIN, span: SPAN, issues: ISSUES });
      assert.equal(genRes.status, 200);
      generated = await genRes.json();
      assert.equal(generated.usedLLM, true);
    } finally {
      resetLLMProvider();
    }

    clearDoctorCache();
    const writerRes = await post({ fountain: FOUNTAIN, candidateFountain: generated.candidateFountain });
    assert.equal(writerRes.status, 200);
    const writer = await writerRes.json();

    assert.deepEqual(writer.before, generated.before);
    assert.deepEqual(writer.after, generated.after);
    assert.deepEqual(writer.cleared, generated.cleared);
    assert.deepEqual(writer.introduced, generated.introduced);
    assert.deepEqual(writer.structuralSignals, generated.structuralSignals);
  });

  it('writer-supplied candidate: an identical candidate yields exactly zero deltas', async () => {
    const res = await post({ fountain: FOUNTAIN, candidateFountain: FOUNTAIN });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.usedLLM, false);
    assert.equal(body.source, 'writer');
    assert.deepEqual(body.cleared, [], 'no findings can clear when the text did not change');
    assert.deepEqual(body.introduced, [], 'no findings can appear when the text did not change');
    assert.equal(body.after.health, body.before.health);
    assert.equal(body.after.verdict, body.before.verdict);
    assert.equal(body.after.contentHash, body.before.contentHash);
    // The descriptive aggregates are equal too — same text, same reading.
    assert.deepEqual(body.structuralSignals.after, body.structuralSignals.before);
  });

  it('400 on a pathological candidateFountain (the same shape guard the fountain field applies)', async () => {
    // A single unbroken run past MAX_FOUNTAIN_TOKEN_CHARS — one of the two
    // measured O(n^2) analyzer shapes. A candidate exempt from this guard
    // would be a straight bypass of it, since the candidate goes to the same
    // analyzer the `fountain` field does.
    const res = await post({
      fountain: FOUNTAIN,
      candidateFountain: `${FOUNTAIN}\n${'x'.repeat(2_001)}\n`,
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(String(body.error), /candidateFountain/);
  });

  it('400 on an empty-string candidateFountain', async () => {
    const res = await post({ fountain: FOUNTAIN, candidateFountain: '' });
    assert.equal(res.status, 400);
  });

  it('400 when neither candidateFountain nor span+issues is provided', async () => {
    const res = await post({ fountain: FOUNTAIN });
    assert.equal(res.status, 400);
  });

  it('400 when span is given without issues and no candidateFountain', async () => {
    const res = await post({ fountain: FOUNTAIN, span: SPAN });
    assert.equal(res.status, 400);
  });
});
