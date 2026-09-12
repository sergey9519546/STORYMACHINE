// THE WORK IS BOUNDED, NOT THE DOCUMENT.
//
// ── What this file is for (2026-09-12, engine-logic finding 10) ────────────
// `analyzeVoices` computes a Burrows's-Delta pair grid, which is O(distinct^2).
// The repository's answer to that cost has been a shape guard that refuses to
// analyze the document at all, and the review's finding 10 is about what that
// costs a writer: on `main`, a 20-speaking-character ensemble — a heist, a
// courtroom drama, a war film, a TV pilot — is REJECTED outright and gets no
// score, no report, just "trim the cast or split the draft".
//
// The fix here is the one the review names: bound the WORK. The grid covers the
// `MAX_VOICE_SCORED_SPEAKERS` eligible characters with the most dialogue and
// names the rest; the document is analyzed by every other pass either way.
//
// ── What this file deliberately does NOT do ────────────────────────────────
// It changes no constant in server/lib/validation.ts. Re-deriving
// `MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT` from cost is a sibling lane's work
// (`lane/rulebook-and-guard-bound`), and two lanes editing one constant from
// two different cost models is how a bound stops meaning anything. What this
// file adds is the MEASUREMENT that lane needs: with the grid flat, the cost
// curve the bound is derived from is a different curve.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeVoices, MAX_VOICE_SCORED_SPEAKERS } from '../../server/nvm/analyze/voice-delta.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { fountainShapeRejectionReason } from '../../server/lib/validation.ts';

const LEX = ('we move at three and then go back to the yard before the light comes up over '
  + 'the river tonight she said nothing at all about the money or the man who took it').split(' ');

function line(seed: number, n: number): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(LEX[(seed * 11 + i * 7) % LEX.length]);
  return out.join(' ');
}

function byCharacter(cast: number, wordsEach: number): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (let i = 0; i < cast; i++) m[`CHARACTER${i}`] = [line(i, wordsEach)];
  return m;
}

/** A normally-shaped feature: `cast` speakers over 120 scenes, Zipf-weighted so
 *  the principals carry most of the ~15,000 dialogue words and the minor
 *  characters still clear the 30-word eligibility floor. */
function ensembleFeature(cast: number, totalDialogueWords = 15000, scenes = 120): string {
  const weights = Array.from({ length: cast }, (_, i) => 1 / (i + 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  const words = weights.map((w) => Math.max(35, Math.round((w / sum) * totalDialogueWords)));
  const cuesPerScene = Math.ceil(cast / scenes) + 2;
  const out: string[] = [];
  let speaker = 0;
  for (let s = 0; s < scenes; s++) {
    out.push(`INT. LOCATION ${s} - NIGHT`, '', 'Someone moves through the room and looks at the door.', '');
    for (let k = 0; k < cuesPerScene; k++) {
      const i = speaker++ % cast;
      const chunk = Math.max(8, Math.round(words[i] / Math.max(1, Math.ceil((scenes * cuesPerScene) / cast))));
      out.push(`CHARACTER${i}`, line(i * 3 + k, chunk), '');
    }
  }
  return out.join('\n');
}

describe('the pair grid stops growing at the cap (finding 10)', () => {
  it('the grid is exactly the cap\'s worth of pairs however large the cast is', () => {
    const capPairs = (MAX_VOICE_SCORED_SPEAKERS * (MAX_VOICE_SCORED_SPEAKERS - 1)) / 2;
    for (const cast of [MAX_VOICE_SCORED_SPEAKERS, 100, 223, 500]) {
      const r = analyzeVoices(byCharacter(cast, 30));
      assert.equal(
        r.pairs.length, capPairs,
        `a cast of ${cast} produced ${r.pairs.length} pairs; the cap is ${MAX_VOICE_SCORED_SPEAKERS} speakers `
        + `= ${capPairs} pairs. Uncapped, 223 speakers is 24,753 pairs and 500 is 124,750.`,
      );
      assert.equal(r.scored, true, `a cast of ${cast} must still be scored, not abstained`);
    }
  });

  it('a cast at or under the cap is unchanged — every eligible speaker is still compared', () => {
    for (const cast of [2, 5, 20, MAX_VOICE_SCORED_SPEAKERS]) {
      const r = analyzeVoices(byCharacter(cast, 30));
      assert.equal(r.pairs.length, (cast * (cast - 1)) / 2, `cast ${cast} lost pairs it should have kept`);
      assert.deepEqual(r.notVoiceScoredCharacters, [], `cast ${cast} should have nobody held out by the cap`);
    }
  });

  it('the speakers kept are the ones with the most dialogue, and the rest are NAMED', () => {
    // Word counts descending by index, so the kept set is predictable without
    // reimplementing the selection here.
    const m: Record<string, string[]> = {};
    const cast = MAX_VOICE_SCORED_SPEAKERS + 10;
    for (let i = 0; i < cast; i++) m[`CHARACTER${i}`] = [line(i, 400 - i * 5)];
    const r = analyzeVoices(m);
    assert.equal(r.notVoiceScoredCharacters.length, 10);
    for (let i = MAX_VOICE_SCORED_SPEAKERS; i < cast; i++) {
      assert.ok(
        r.notVoiceScoredCharacters.includes(`CHARACTER${i}`),
        `CHARACTER${i} has the ${cast - i}th-least dialogue and should be the one held out, not scored`,
      );
    }
    const named = new Set(r.pairs.flatMap((p) => [p.a, p.b]));
    for (const c of r.notVoiceScoredCharacters) {
      assert.ok(!named.has(c), `${c} is reported as not voice-scored but appears in a pair`);
    }
  });

  it('the selection is deterministic, including its tie-break', () => {
    // Every speaker carries the SAME word count, so only the tie-break decides.
    const m = byCharacter(MAX_VOICE_SCORED_SPEAKERS + 5, 30);
    const a = analyzeVoices(m);
    const b = analyzeVoices(m);
    assert.deepEqual(a.notVoiceScoredCharacters, b.notVoiceScoredCharacters);
    assert.deepEqual(a.pairs.map((p) => `${p.a}|${p.b}`), b.pairs.map((p) => `${p.a}|${p.b}`));
    // Ties break on the input's own key order, so the LAST five are the ones
    // held out — and both lists come back in input order, like excludedCharacters.
    assert.deepEqual(
      a.notVoiceScoredCharacters,
      Array.from({ length: 5 }, (_, i) => `CHARACTER${MAX_VOICE_SCORED_SPEAKERS + i}`),
    );
  });

  it('the cap is a WORK bound, not an eligibility floor — the two lists mean different things', () => {
    const m: Record<string, string[]> = {};
    for (let i = 0; i < MAX_VOICE_SCORED_SPEAKERS + 3; i++) m[`CHARACTER${i}`] = [line(i, 400 - i)];
    m.WHISPER = ['just five words here now'];
    const r = analyzeVoices(m);
    assert.ok(r.excludedCharacters.includes('WHISPER'), 'a speaker under the 30-word floor is EXCLUDED, as before');
    assert.ok(!r.notVoiceScoredCharacters.includes('WHISPER'), 'and is not also reported as capped out');
    assert.equal(r.notVoiceScoredCharacters.length, 3);
  });
});

describe('an ordinary ensemble feature is analyzed instead of refused (finding 10)', () => {
  for (const cast of [20, 30, 40, 60]) {
    it(`a ${cast}-speaking-character feature is ACCEPTED and gets a voice section`, async () => {
      const text = ensembleFeature(cast);
      const reject = fountainShapeRejectionReason(text);
      assert.equal(
        reject, null,
        `a ${cast}-character feature (${text.length} chars) was refused: ${reject}. On main this is exactly `
        + 'what happened at cast 20 and above — no score, no report, "trim the cast or split the draft".',
      );
      const report = await runScriptDoctor(text);
      assert.ok(report.health > 0, 'the document must be scored');
      const va = report.voiceAnalysis;
      assert.ok(va, 'the report must carry a voice section');
      assert.equal(va!.scored, true, `the voice section abstained on a ${cast}-character feature`);
      const expectedPairs = cast <= MAX_VOICE_SCORED_SPEAKERS
        ? (cast * (cast - 1)) / 2
        : (MAX_VOICE_SCORED_SPEAKERS * (MAX_VOICE_SCORED_SPEAKERS - 1)) / 2;
      assert.equal(va!.pairs.length, expectedPairs);
      assert.equal(
        (va!.notVoiceScoredCharacters ?? []).length,
        Math.max(0, cast - MAX_VOICE_SCORED_SPEAKERS),
        'every character the cap held out must be named, so a partial matrix is never unexplained',
      );
    });
  }
});
