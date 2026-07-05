// Fix & Verify (Run 11) — unit tests for fix.ts's fixAndVerify(). All
// provider calls go through the ai.ts seam (setLLMProvider) — no network,
// ever, matching tests/core/deep-read.test.ts's idiom.
//
// Fixture rationale: DIALOGUE_QUESTION_FLOOD (server/nvm/revision/passes/
// dialogue.ts, Wave 336) fires when >35% of dialogue lines (with >=10 total)
// end with "?", at the whole-document location "Dialogue throughout" — no
// scene- or line-anchoring, so it's a genuine whole-document rule, not
// something a span replace could trivially fake. Verified empirically against
// runScriptDoctor before writing these assertions (not assumed): the
// QUESTION_SCENE below puts 10 consecutive JAX question-lines ahead of 4
// MARA declarative lines (10 of 14 dialogue lines are questions, 71% > 35%),
// and PADDING adds enough scene/word volume that health lands well off both
// clamps (0 and 100), so a genuine before/after health delta is observable
// instead of two saturated reports comparing equal.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fixAndVerify, evaluateSpanRewrite } from '../../server/nvm/analyze/fix.ts';
import { runScriptDoctor, clearDoctorCache, computeContentHash } from '../../server/nvm/analyze/doctor.ts';
import { setLLMProvider, resetLLMProvider } from '../../server/engine/ai.ts';
import type { LLMProvider } from '../../server/engine/ai.ts';

// ── Fixture ──────────────────────────────────────────────────────────────

// Lines 1-2 are the slugline + blank; lines 3-25 are 8 JAX cue/question pairs
// (the span these tests target); lines 27-31 are 2 more JAX questions left
// untouched; lines 33-43 are 4 MARA declarative cue/line pairs.
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

// Padding: extra scenes/word volume so health doesn't saturate at the [0,100]
// clamp for either the baseline or the candidate (verified empirically —
// without this, both reports clamp to health 0 and no delta is observable).
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

// Target span: lines 3-25, the first 8 of JAX's 10 question turns.
const TARGET_SPAN = { startLine: 3, endLine: 25 };
const FIX_ISSUES = [{
  rule: 'DIALOGUE_QUESTION_FLOOD',
  description: '10 of 14 dialogue lines end with a question mark — more than a third of all dialogue is interrogative.',
  suggestedFix: 'Recast most of these questions as declarative statements.',
}];

// A valid replacement for lines 3-25: the same 8 JAX cue/line pairs, recast
// as declarative statements — no question marks, no added/removed sluglines,
// comparable length to the original span.
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

function mockProvider(text: string): LLMProvider {
  return { generate: async () => ({ text } as never) };
}

describe('nvm/analyze/fix — fixAndVerify (core, mocked provider)', () => {
  beforeEach(() => {
    clearDoctorCache();
  });
  afterEach(() => {
    resetLLMProvider();
  });

  it('a valid span rewrite clears DIALOGUE_QUESTION_FLOOD, reports a positive health delta, splices correctly, and both contentHashes are present and correct', async () => {
    setLLMProvider(mockProvider(VALID_REPLACEMENT));

    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);

    assert.equal(result.usedLLM, true);
    assert.equal('note' in result, false);
    assert.ok(result.before && result.after);

    // The rule this fix targets is gone from the whole-document delta.
    assert.ok(
      result.cleared!.some(i => i.rule === 'DIALOGUE_QUESTION_FLOOD'),
      `expected DIALOGUE_QUESTION_FLOOD in cleared, got: ${JSON.stringify(result.cleared)}`,
    );

    // Health genuinely improved (both reports verified off the [0,100] clamps).
    assert.ok(result.before!.health > 0 && result.before!.health < 100);
    assert.ok(result.after!.health > result.before!.health, `expected health to improve: before=${result.before!.health} after=${result.after!.health}`);

    // The candidate splices correctly: span replaced, everything else untouched.
    const expectedCandidate = [
      ...FOUNTAIN.split('\n').slice(0, 2),
      ...VALID_REPLACEMENT.split('\n'),
      ...FOUNTAIN.split('\n').slice(25),
    ].join('\n');
    assert.equal(result.candidateFountain, expectedCandidate);
    assert.equal(result.spanReplacement, VALID_REPLACEMENT);
    assert.deepEqual(result.span, TARGET_SPAN);

    // Both contentHashes present and independently correct.
    assert.equal(result.before!.contentHash, computeContentHash(FOUNTAIN));
    assert.equal(result.after!.contentHash, computeContentHash(result.candidateFountain!));

    // The delta is provable, not asserted: re-running the doctor on both
    // texts directly must reproduce the same before/after health and the
    // same absence of DIALOGUE_QUESTION_FLOOD in the candidate.
    const baselineReport = await runScriptDoctor(FOUNTAIN);
    const candidateReport = await runScriptDoctor(result.candidateFountain!);
    assert.equal(baselineReport.health, result.before!.health);
    assert.equal(candidateReport.health, result.after!.health);
    assert.ok(!candidateReport.passes.find(p => p.pass === 'dialogue')!.issues.some(i => i.rule === 'DIALOGUE_QUESTION_FLOOD'));
  });

  it('a mock rewrite that introduces a NEW issue (regression) surfaces it in `introduced`', async () => {
    // Target MARA's 4-line declarative block and turn it into 3 consecutive
    // questions — RHETORICAL_QUESTION_FLOOD never fires for MARA in the
    // baseline (she never asks 3 consecutive questions there), so any
    // instance of it for MARA in the candidate is a genuine regression.
    const marabSpan = { startLine: 33, endLine: 43 };
    const regressionReplacement = `MARA
Why didn't you tell me?

MARA
What are you hiding from me?

MARA
Should I even trust you anymore?`;
    setLLMProvider(mockProvider(regressionReplacement));

    const result = await fixAndVerify(FOUNTAIN, marabSpan, [{
      rule: 'DIALOGUE_MONOTONE',
      description: "MARA's lines all read flatly declarative.",
    }]);

    assert.equal(result.usedLLM, true);
    assert.ok(result.introduced && result.introduced.length > 0, 'expected at least one introduced regression');
    assert.ok(
      result.introduced!.some(i => i.rule === 'RHETORICAL_QUESTION_FLOOD' && i.location.includes('MARA')),
      `expected a MARA RHETORICAL_QUESTION_FLOOD regression, got: ${JSON.stringify(result.introduced)}`,
    );
  });

  it('guard: empty/whitespace model output is rejected with no candidate', async () => {
    setLLMProvider(mockProvider('   \n  '));
    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);
    assert.equal(result.usedLLM, false);
    assert.equal(typeof result.note, 'string');
    assert.ok(result.note!.length > 0);
    assert.equal(result.candidateFountain, undefined);
    assert.equal(result.cleared, undefined);
    assert.equal(result.introduced, undefined);
  });

  it('guard: a wildly oversized (~10x) reply is rejected as outside the length-ratio band', async () => {
    const spanText = FOUNTAIN.split('\n').slice(TARGET_SPAN.startLine - 1, TARGET_SPAN.endLine).join('\n');
    const garbage = 'JAX\n' + 'This line pads the reply far beyond any reasonable length. '.repeat(Math.ceil(spanText.length * 10 / 60));
    setLLMProvider(mockProvider(garbage));
    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);
    assert.equal(result.usedLLM, false);
    assert.match(result.note!, /length/i);
    assert.equal(result.candidateFountain, undefined);
  });

  it('guard: a reply that adds a slugline the original span did not have is rejected', async () => {
    const withAddedSlugline = VALID_REPLACEMENT + '\n\nINT. NEW SCENE - DAY\n\nJAX\nWait, what is this place?';
    setLLMProvider(mockProvider(withAddedSlugline));
    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);
    assert.equal(result.usedLLM, false);
    assert.match(result.note!, /scene heading/i);
    assert.equal(result.candidateFountain, undefined);
  });

  it('guard: a reply identical to the original span is rejected (nothing changed)', async () => {
    const spanText = FOUNTAIN.split('\n').slice(TARGET_SPAN.startLine - 1, TARGET_SPAN.endLine).join('\n');
    setLLMProvider(mockProvider(spanText));
    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);
    assert.equal(result.usedLLM, false);
    assert.match(result.note!, /identical|nothing to change/i);
    assert.equal(result.candidateFountain, undefined);
  });

  it('keyless: no provider configured (default Gemini provider, no GEMINI_API_KEY) yields usedLLM:false and a note, nothing else', async () => {
    // resetLLMProvider (afterEach already resets, but be explicit here so
    // this test doesn't depend on hook ordering) restores the real Gemini
    // provider, which throws synchronously for lack of a key — the same
    // keyless path every other AI-backed route in this product exercises.
    resetLLMProvider();
    const result = await fixAndVerify(FOUNTAIN, TARGET_SPAN, FIX_ISSUES);
    assert.equal(result.usedLLM, false);
    assert.equal(typeof result.note, 'string');
    assert.ok(result.note!.length > 0);
    assert.equal(result.candidateFountain, undefined);
    assert.equal(result.before, undefined);
    assert.equal(result.after, undefined);
  });

  it('span clamping: out-of-range and reversed line numbers never throw', async () => {
    setLLMProvider(mockProvider(VALID_REPLACEMENT));
    await assert.doesNotReject(() => fixAndVerify(FOUNTAIN, { startLine: 99999, endLine: 999999 }, FIX_ISSUES));
    await assert.doesNotReject(() => fixAndVerify(FOUNTAIN, { startLine: 0, endLine: -5 }, FIX_ISSUES));
    await assert.doesNotReject(() => fixAndVerify(FOUNTAIN, { startLine: 20, endLine: 3 }, FIX_ISSUES));

    // A reversed (end before start) span still clamps to a real, in-bounds,
    // non-degenerate range (start <= end) rather than throwing or producing
    // an inverted span — {25, 3} swaps to exactly TARGET_SPAN {3, 25}, so
    // this also exercises the swap landing on a real, LLM-acceptable target.
    const totalLines = FOUNTAIN.split('\n').length;
    const reversedResult = await fixAndVerify(FOUNTAIN, { startLine: 25, endLine: 3 }, FIX_ISSUES);
    assert.ok(reversedResult.span, 'expected a resolved span even for a reversed input range');
    assert.deepEqual(reversedResult.span, TARGET_SPAN);
    assert.ok(reversedResult.span!.startLine >= 1 && reversedResult.span!.endLine <= totalLines);
  });
});

describe('nvm/analyze/fix — evaluateSpanRewrite (pure guard unit tests)', () => {
  const span = { startLine: 3, endLine: 25 };

  it('fire: rejects empty output', () => {
    const v = evaluateSpanRewrite('   ', 'JAX\nHello.', span);
    assert.equal(v.accept, false);
  });
  it('no-fire: accepts a reasonable, changed, same-slugline-count replacement', () => {
    const v = evaluateSpanRewrite('JAX\nGoodbye.', 'JAX\nHello.', span);
    assert.equal(v.accept, true);
  });

  it('fire: rejects a reply below the minimum length ratio', () => {
    const v = evaluateSpanRewrite('Hi.', 'JAX\n' + 'A fairly long line of dialogue that goes on for a while.'.repeat(3), span);
    assert.equal(v.accept, false);
  });
  it('no-fire: accepts a reply within the length-ratio band', () => {
    const original = 'JAX\nThis is a normal-length line of dialogue.';
    const v = evaluateSpanRewrite('JAX\nThis is also a normal-length line of talk.', original, span);
    assert.equal(v.accept, true);
  });

  it('fire: rejects a reply that adds a slugline not present in the original', () => {
    const v = evaluateSpanRewrite('INT. NEW PLACE - DAY\n\nJAX\nHello.', 'JAX\nHello there friend.', span);
    assert.equal(v.accept, false);
  });
  it('no-fire: accepts when slugline counts match (both zero)', () => {
    const v = evaluateSpanRewrite('JAX\nGoodbye now.', 'JAX\nHello there.', span);
    assert.equal(v.accept, true);
  });

  it('fire: rejects output identical to the trimmed input', () => {
    const v = evaluateSpanRewrite('JAX\nHello there.', 'JAX\nHello there.', span);
    assert.equal(v.accept, false);
  });
  it('no-fire: accepts output that differs from the trimmed input', () => {
    const v = evaluateSpanRewrite('JAX\nHello there again.', 'JAX\nHello there.', span);
    assert.equal(v.accept, true);
  });
});
