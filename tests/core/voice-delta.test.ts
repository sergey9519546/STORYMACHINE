// Voice-delta (Burrows's Delta) differentiation and voice-swap risk detection.
//
// Coverage: burrowsDelta and analyzeVoices, fire + no-fire tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { burrowsDelta, analyzeVoices } from '../../server/nvm/analyze/voice-delta.ts';

describe('burrowsDelta — pure distance metric', () => {
  it('fires: distinct voices yield high delta', () => {
    const terseLine = ['Go now.', 'Move fast.', 'Do it.', 'Stop talking.', 'Leave.', 'Act.', 'Now.', 'Fast.'];
    const verboseLine = [
      "I think maybe we should probably go, don't you?",
      'Perhaps it might be wise to consider leaving soon.',
      'I would suggest that we could possibly leave now.',
      'It seems to me that maybe we should go soon.',
      'I believe we might want to think about leaving.',
      'Could we possibly consider going now?',
    ];

    const delta = burrowsDelta(terseLine, verboseLine);
    assert.ok(delta > 0.2, `distinct voices delta ${delta} must be > 0.2`);
  });

  it('fires: identical dialogue sets yield delta 0', () => {
    const dialogue = ['I think we should go now.', 'I believe this is correct.', 'I am sure of this.', 'I will do it.', 'I think so.', 'I am here.'];
    const delta = burrowsDelta(dialogue, dialogue);
    assert.equal(delta, 0, 'identical voices should yield delta 0');
  });

  it('no-fire: empty input returns 0', () => {
    assert.equal(burrowsDelta([], []), 0);
    assert.equal(burrowsDelta(['I go now.'], []), 0);
    assert.equal(burrowsDelta([], ['I go now.']), 0);
  });

  it('deterministic: same input always produces same output', () => {
    const a = ['I will do what you ask.', 'Let me think about it.', 'I am not sure if I can help.'];
    const b = ['Go now!', 'Move fast!', 'Do it!'];

    const delta1 = burrowsDelta(a, b);
    const delta2 = burrowsDelta(a, b);
    const delta3 = burrowsDelta(a, b);

    assert.equal(delta1, delta2);
    assert.equal(delta2, delta3);
  });

  it('symmetric: delta(a,b) approximately equals delta(b,a)', () => {
    const a = ['I think we should go.', 'Perhaps it is time.', 'Maybe we could leave.'];
    const b = ['Go!', 'Now!', 'Fast!'];

    const dab = burrowsDelta(a, b);
    const dba = burrowsDelta(b, a);
    assert.ok(Math.abs(dab - dba) < 1e-10);
  });
});

describe('analyzeVoices — multi-character voice analysis', () => {
  it('fires: identical voices flagged as swap risk', () => {
    const dialogues = {
      alice: [
        'I think we should go to the store today and buy some things.',
        'I believe this is correct and I am sure of it.',
        'I think so and I will do what you ask.',
        'I am here and I will stay for a while.',
        'I think maybe we should consider going soon.',
        'I believe it is a good idea to continue.',
        'I think that we will be fine and everything will work out.',
        'I am quite sure about this and I will not change my mind.',
      ],
      bob: [
        'I think we should go to the store today and buy some things.',
        'I believe this is correct and I am sure of it.',
        'I think so and I will do what you ask.',
        'I am here and I will stay for a while.',
        'I think maybe we should consider going soon.',
        'I believe it is a good idea to continue.',
        'I think that we will be fine and everything will work out.',
        'I am quite sure about this and I will not change my mind.',
      ],
    };

    const result = analyzeVoices(dialogues);
    assert.equal(result.scored, true);
    assert.equal(result.pairs.length, 1);

    const pair = result.pairs[0];
    assert.ok(pair.swapRisk);
    assert.equal(pair.delta, 0);
  });

  it('fires: distinct voices not flagged as swap risk', () => {
    const dialogues = {
      alice: [
        'Go now and move right away.',
        'Move fast and act quickly.',
        'Do it right now.',
        'Stop talking and go.',
        'Leave immediately and go now.',
        'Act fast and move now.',
        'Now is the time to act.',
        'Fast moves are needed today.',
        'Go and go now fast.',
        'Do the work and go now.',
      ],
      bob: [
        'I think perhaps we should go to the store and consider what we might do there.',
        'I believe maybe we could leave later if you think that is better for us.',
        'I am not sure if I can help you with this task right now and today.',
        'I think possibly we should move forward with this plan and see what happens.',
        'I believe we might go soon if everything works out as planned and we agree.',
        'I am hesitant but willing to try this new approach and method here today.',
        'I would suggest we consider going and see what happens next in our lives.',
        'Perhaps it is time for us to make a decision about this matter together.',
        'I am wondering if we should think about this more carefully before deciding.',
        'I believe we should consider all the options available to us right now today.',
      ],
    };

    const result = analyzeVoices(dialogues);
    assert.equal(result.scored, true, `must score with enough words (scored=${result.scored})`);
    assert.equal(result.pairs.length, 1);

    const pair = result.pairs[0];
    assert.ok(!pair.swapRisk, `distinct voices must not flag swapRisk (delta=${pair.delta})`);
    assert.ok(pair.delta > 0.15, `distinct voices delta ${pair.delta} should be > 0.15`);
  });

  it('computes all pairwise combinations for 3 characters', () => {
    const dialogues = {
      char1: [
        'I go now and I think we should consider the options carefully.',
        'I think so and I believe this is the right choice.',
        'I will do it and I am sure it will work fine.',
        'I am here and I will stay for a long time.',
        'I believe this and I think we should continue.',
        'I think maybe and I am quite sure about it.',
      ],
      char2: [
        'I go now and I think we should consider the options carefully.',
        'I think so and I believe this is the right choice.',
        'I will do it and I am sure it will work fine.',
        'I am here and I will stay for a long time.',
        'I believe this and I think we should continue.',
        'I think maybe and I am quite sure about it.',
      ],
      char3: [
        'I go now and I think we should consider the options carefully.',
        'I think so and I believe this is the right choice.',
        'I will do it and I am sure it will work fine.',
        'I am here and I will stay for a long time.',
        'I believe this and I think we should continue.',
        'I think maybe and I am quite sure about it.',
      ],
    };

    const result = analyzeVoices(dialogues);
    assert.equal(result.scored, true);
    assert.equal(result.pairs.length, 3);
  });

  it('no-fire: abstains with fewer than 2 characters', () => {
    const result1 = analyzeVoices({});
    assert.equal(result1.scored, false);

    const result2 = analyzeVoices({
      alice: ['I go now.', 'I come back.'],
    });
    assert.equal(result2.scored, false);
  });

  it('no-fire: abstains when any character has less than 30 words', () => {
    const result = analyzeVoices({
      alice: ['I go.', 'I come.'],
      bob: ['Go fast!', 'Move now!', 'Act!', 'Do it!'],
    });

    assert.equal(result.scored, false);
    assert.equal(result.pairs.length, 0);
  });

  it('fires: sufficient words enable scoring', () => {
    const words30 = Array.from({ length: 6 }, (_, i) => `Word${i} word word word word.`).join(' ');
    const result = analyzeVoices({
      alice: [words30],
      bob: [words30],
    });

    assert.equal(result.scored, true);
    assert.ok(result.pairs.length > 0);
  });

  it('deterministic: same input always produces same output', () => {
    const dialogues = {
      alice: [
        'I think line is interesting and I enjoy this.',
        'I believe this is good and I like it.',
        'I think maybe so and I am sure.',
        'I am here now and I will stay.',
        'I think so and I agree.',
        'I believe it and I am confident.',
      ],
      bob: [
        'Go line now fast and move ahead.',
        'Go do it fast and act quick.',
        'Move now fast and go ahead.',
        'Act fast now and do it.',
        'Go now and move quickly.',
        'Fast now and act quick.',
      ],
    };

    const result1 = analyzeVoices(dialogues);
    const result2 = analyzeVoices(dialogues);

    assert.deepEqual(result1.pairs, result2.pairs);
    assert.equal(result1.scored, result2.scored);
  });

  it('no-fire: empty dialogue lines abstain', () => {
    const result = analyzeVoices({
      alice: ['', '', ''],
      bob: ['', '', ''],
    });

    assert.equal(result.scored, false);
    assert.equal(result.pairs.length, 0);
  });

  it('fires: whitespace-heavy but word-containing lines process', () => {
    const result = analyzeVoices({
      alice: Array.from({ length: 10 }, () => '   I think   maybe   we should consider   '),
      bob: Array.from({ length: 10 }, () => '   Go   fast   and   move   now   '),
    });

    assert.equal(result.scored, true);
    assert.ok(result.pairs.length > 0);
  });
});
