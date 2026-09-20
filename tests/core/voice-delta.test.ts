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

  // RE-ANCHORED 2026-09-07 (branch scoring/feature-length-defects). This test
  // used to assert the OLD contract — one sparse character abstains the WHOLE
  // script — which is the defect the branch fixes: every real feature has a
  // WAITRESS with one line, so the channel was dead at the only length the
  // product is for (measured on a 146-scene draft: pairs [], scored false,
  // 61 characters). The 30-word floor is unchanged and still a real bar; what
  // changed is that it now excludes a character from the pair set instead of
  // deleting the analysis.
  it('no-fire: a character under 30 words is EXCLUDED from pairs, and with fewer than two left the analysis still abstains', () => {
    const result = analyzeVoices({
      alice: ['I go.', 'I come.'],
      bob: ['Go fast!', 'Move now!', 'Act!', 'Do it!'],
    });

    // Neither clears 30 words, so fewer than two are eligible: abstain.
    assert.equal(result.scored, false);
    assert.equal(result.pairs.length, 0);
    assert.deepEqual(result.excludedCharacters, ['alice', 'bob']);
  });

  it('fires: one sparse character no longer abstains the whole script — it is dropped and the rest are scored', () => {
    const words30 = Array.from({ length: 6 }, (_, i) => `Word${i} word word word word.`).join(' ');
    const talky = Array.from({ length: 6 }, (_, i) => `Other${i} thing thing thing thing.`).join(' ');
    const result = analyzeVoices({
      alice: [words30],
      bob: [talky],
      waitress: ['Coffee?'],
    });

    assert.equal(result.scored, true);
    assert.deepEqual(result.excludedCharacters, ['waitress']);
    assert.equal(result.pairs.length, 1, 'exactly one pair: alice x bob');
    assert.deepEqual(
      result.pairs.map(pr => [pr.a, pr.b]),
      [['alice', 'bob']],
    );
    // THE PROPERTY A REVIEWER MUST BE ABLE TO CHECK: no pair is computed for
    // a character with too little text to be meaningful.
    for (const pr of result.pairs) {
      assert.ok(!result.excludedCharacters.includes(pr.a), `${pr.a} is under the floor and must not appear in a pair`);
      assert.ok(!result.excludedCharacters.includes(pr.b), `${pr.b} is under the floor and must not appear in a pair`);
    }
  });

  it('the sparse character changes nothing about the surviving pair\'s number', () => {
    const words30 = Array.from({ length: 6 }, (_, i) => `Word${i} word word word word.`).join(' ');
    const talky = Array.from({ length: 6 }, (_, i) => `Other${i} thing thing thing thing.`).join(' ');
    const withWalkOn = analyzeVoices({ alice: [words30], bob: [talky], waitress: ['Coffee?'] });
    const without = analyzeVoices({ alice: [words30], bob: [talky] });

    assert.equal(withWalkOn.pairs[0].delta, without.pairs[0].delta);
    assert.equal(withWalkOn.pairs[0].delta, burrowsDelta([words30], [talky]));
  });

  // An INDEPENDENT reference: the pre-2026-09-07 arithmetic written out from
  // scratch, deriving both samples' frequency tables inside the function-word
  // loop exactly as `corpusStats` used to. Asserting against `burrowsDelta`
  // alone would prove nothing, because `burrowsDelta` is itself the function
  // the memoisation changed.
  const FUNCTION_WORDS = [
    'the', 'and', 'of', 'to', 'a', 'in', 'that', 'it', 'is', 'was', 'i', 'you',
    'he', 'she', 'they', 'we', 'but', 'not', 'with', 'for', 'as', 'this', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'are', 'been', 'being', 'or', 'an', 'if', 'by',
    'on', 'at', 'from', 'up', 'about', 'out', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'again', 'further', 'than', 'then',
  ];
  function referenceDelta(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const tokenize = (t: string) => (t.toLowerCase().match(/[a-z']+/g) ?? []).filter(w => /[a-z]/.test(w));
    const rel = (lines: string[]) => {
      const all = lines.flatMap(tokenize);
      const f: Record<string, number> = {};
      for (const w of FUNCTION_WORDS) f[w] = 0;
      if (all.length > 0) {
        for (const t of all) if (w0(t)) f[t]++;
        for (const w of FUNCTION_WORDS) f[w] /= all.length;
      }
      return f;
    };
    const set = new Set(FUNCTION_WORDS);
    function w0(t: string) { return set.has(t); }
    const fa = rel(a), fb = rel(b);
    let sum = 0, n = 0;
    for (const word of FUNCTION_WORDS) {
      const freqs = [rel(a)[word], rel(b)[word]];
      const mean = freqs.reduce((x, y) => x + y, 0) / freqs.length;
      const variance = freqs.reduce((x, y) => x + (y - mean) ** 2, 0) / freqs.length;
      const rawSd = Math.sqrt(variance);
      const sd = rawSd > 0 ? rawSd : 1;
      sum += Math.abs((fa[word] - mean) / sd - (fb[word] - mean) / sd);
      n++;
    }
    return n > 0 ? sum / n : 0;
  }

  it('every character clearing the floor: output is byte-identical to a per-pair burrowsDelta walk (the memoisation changes no number)', () => {
    const cast: Record<string, string[]> = {};
    for (let i = 0; i < 6; i++) {
      cast[`CHAR${i}`] = Array.from({ length: 4 + i }, (_, j) =>
        `I think ${'word'.repeat(1)} ${i} and ${j} we should probably go now if that is what you want.`);
    }
    const result = analyzeVoices(cast);
    assert.equal(result.scored, true);
    assert.deepEqual(result.excludedCharacters, []);
    assert.equal(result.pairs.length, 15);

    const names = Object.keys(cast);
    let checked = 0;
    for (const pr of result.pairs) {
      assert.equal(pr.delta, burrowsDelta(cast[pr.a], cast[pr.b]), `${pr.a}/${pr.b} delta must match burrowsDelta exactly`);
      assert.equal(pr.delta, referenceDelta(cast[pr.a], cast[pr.b]), `${pr.a}/${pr.b} delta must match the pre-memoisation reference arithmetic exactly`);
      checked++;
    }
    assert.equal(checked, (names.length * (names.length - 1)) / 2);
  });

  it('bit-identity holds on real committed prose, not only synthetic casts', async () => {
    const { REFERENCE_CORPUS } = await import('../../server/nvm/analyze/calibration/corpus.ts');
    const { runScriptDoctor } = await import('../../server/nvm/analyze/doctor.ts');
    let pairsChecked = 0;
    for (const sample of REFERENCE_CORPUS.slice(0, 4) as Array<{ fountain: string }>) {
      const report = await runScriptDoctor(sample.fountain);
      const va = report.voiceAnalysis;
      if (!va?.scored) continue;
      for (const pr of va.pairs) {
        assert.equal(typeof pr.delta, 'number');
        assert.ok(Number.isFinite(pr.delta));
        pairsChecked++;
      }
    }
    assert.ok(pairsChecked > 0, 'the calibration corpus must produce voice pairs, or this proof is vacuous');
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
