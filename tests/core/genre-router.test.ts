// B1-a — Genre Engine Expansion: tests for server/lib/genre-router.ts's
// expanded genre roster (8 original + 20 new = 28), the new tone-register
// axis (composeThresholds), the genreRules structural-contract surface
// (genrePromiseBlock), and the new POST /api/story-tone route.
//
// Route-level tests reuse tests/routes/helpers.ts's real-Express-app harness
// (see tests/routes/config.test.ts for the pattern this mirrors) so the zod
// validation on the new route is exercised through actual HTTP, not just the
// schema in isolation.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENRE_MODIFIERS,
  GENRE_NAMES,
  GENRE_RULE_MODIFIERS,
  THRESHOLD_BOUNDS,
  GENERIC_THRESHOLD_DEFAULTS,
  TONE_REGISTERS,
  TONE_NAMES,
  TONE_NAME_LIST,
  genrePromptBlock,
  genrePromiseBlock,
  composePromptModifiers,
  composeThresholds,
  clampThreshold,
  toneInstructionBlock,
  SYNERGY_OVERRIDES,
  type GenreId,
  type ToneName,
  type GenreRuleThresholds,
} from '../../server/lib/genre-router.ts';
import { startTestServer, freshSessionId, type TestServer } from '../routes/helpers.ts';

const ALL_GENRES = Object.keys(GENRE_NAMES) as GenreId[];
const ALL_TONES = Object.keys(TONE_NAMES) as ToneName[];
const THRESHOLD_FIELDS = Object.keys(THRESHOLD_BOUNDS) as Array<keyof GenreRuleThresholds>;

const ORIGINAL_8: GenreId[] = ['thriller', 'horror', 'drama', 'comedy', 'romance', 'sci_fi', 'noir', 'mystery'];

// ── GENRE_MODIFIERS — completeness across the expanded roster ───────────────

describe('GENRE_MODIFIERS — roster size and completeness', () => {
  it('expands to 28 total genres (8 original + 20 new)', () => {
    assert.equal(ALL_GENRES.length, 28);
    for (const g of ORIGINAL_8) assert.ok(ALL_GENRES.includes(g), `${g} must still be present`);
  });

  it('every genre has complete, non-empty toneInstruction/register/emotionalRegister/forbiddenCliches', () => {
    for (const genre of ALL_GENRES) {
      const m = GENRE_MODIFIERS[genre];
      assert.ok(m, `${genre} must have a GENRE_MODIFIERS entry`);
      assert.ok(m.toneInstruction.length > 20, `${genre}.toneInstruction should be substantive`);
      assert.ok(m.register.length > 5, `${genre}.register should be non-empty`);
      assert.ok(m.emotionalRegister.length > 5, `${genre}.emotionalRegister should be non-empty`);
      assert.ok(m.forbiddenCliches.length >= 3, `${genre} should have >= 3 forbidden clichés`);
      for (const c of m.forbiddenCliches) assert.ok(c.length > 3, `${genre} cliché entries must be substantive`);
    }
  });

  it('every genre has a complete, non-empty genreRules contract', () => {
    const validPositions = new Set(['superior', 'inferior', 'parity']);
    for (const genre of ALL_GENRES) {
      const r = GENRE_MODIFIERS[genre].genreRules;
      assert.ok(r, `${genre} must have genreRules`);
      assert.ok(r.threatType.length > 10, `${genre}.genreRules.threatType should be substantive`);
      assert.ok(validPositions.has(r.informationPositionDefault), `${genre}.genreRules.informationPositionDefault must be a known value`);
      assert.ok(r.requiredBehaviors.length >= 2, `${genre}.genreRules.requiredBehaviors should have >= 2 entries`);
      assert.ok(r.forbiddenShortcuts.length >= 2, `${genre}.genreRules.forbiddenShortcuts should have >= 2 entries`);
    }
  });

  it('all three InformationPosition values are actually used somewhere (no padding to one default)', () => {
    const positions = new Set(ALL_GENRES.map(g => GENRE_MODIFIERS[g].genreRules.informationPositionDefault));
    assert.ok(positions.has('superior'));
    assert.ok(positions.has('inferior'));
    assert.ok(positions.has('parity'));
  });

  it('the 8 original genres keep their pre-B1-a tone/register/cliché/emotional fields byte-identical', () => {
    // Spot-check thriller and mystery in full against their original wording —
    // regression guard for "preserve ALL existing behavior (byte-level)".
    assert.equal(
      GENRE_MODIFIERS.thriller.toneInstruction,
      'GENRE — THRILLER: Every scene tightens a screw. Information is currency; someone always knows more than they admit. Keep the audience one step ahead of one character and one step behind another. Forward momentum is mandatory — no scene ends in the same place it began.',
    );
    assert.equal(GENRE_MODIFIERS.thriller.emotionalRegister, 'controlled dread escalating to panic');
    assert.equal(
      GENRE_MODIFIERS.mystery.toneInstruction,
      'GENRE — MYSTERY: Play fair — every clue the detective sees, the audience sees. The solution must be surprising yet inevitable in hindsight. Red herrings arise from character, not authorial trickery. The investigation reveals the world and its people, not just the culprit.',
    );
    assert.deepEqual(GENRE_MODIFIERS.mystery.forbiddenCliches, [
      'a last-minute suspect introduced in the final act',
      'the detective explaining everything to a gathered room with zero pushback',
      'a twin nobody mentioned',
      'the butler did it',
      'a clue that was hidden from the audience',
    ]);
  });
});

// ── genrePromptBlock ──────────────────────────────────────────────────────────

describe('genre-router — genrePromptBlock', () => {
  it('returns empty string when genre is undefined', () => {
    assert.equal(genrePromptBlock(undefined), '');
  });

  it('produces a tone instruction, register, and cliché list for every one of the 28 genres', () => {
    for (const genre of ALL_GENRES) {
      const block = genrePromptBlock(genre);
      assert.ok(block.length > 0, `${genre} should produce a block`);
      assert.ok(/GENRE —/.test(block), `${genre} block should name the genre`);
      assert.ok(/AVOID THESE/.test(block), `${genre} block should list clichés`);
      assert.ok(/REGISTER:/.test(block), `${genre} block should state register`);
    }
  });
});

// ── genrePromiseBlock (B1-a structural contract) ─────────────────────────────

describe('genre-router — genrePromiseBlock', () => {
  it('returns empty string when genre is undefined (no-fire)', () => {
    assert.equal(genrePromiseBlock(undefined), '');
  });

  it('renders CENTRAL THREAT, REQUIRED, and FORBIDDEN SHORTCUTS lines for every genre (fire)', () => {
    for (const genre of ALL_GENRES) {
      const block = genrePromiseBlock(genre);
      assert.ok(/CENTRAL THREAT:/.test(block), `${genre} promise block should state its central threat`);
      assert.ok(/INFORMATION POSITION:/.test(block), `${genre} promise block should state information position`);
      assert.ok(/REQUIRED:/.test(block), `${genre} promise block should list required behaviors`);
      assert.ok(/FORBIDDEN SHORTCUTS:/.test(block), `${genre} promise block should list forbidden shortcuts`);
    }
  });

  it('mystery promise block names its fair-play contract content', () => {
    const block = genrePromiseBlock('mystery');
    assert.match(block, /traceable, in-world source/);
    assert.match(block, /culprit with no prior setup/);
  });

  it('heist promise block flags unset-up tools as a forbidden shortcut', () => {
    const block = genrePromiseBlock('heist');
    assert.match(block, /tool or gadget used to solve a problem with no earlier setup/);
  });
});

// ── composePromptModifiers — backward compatibility + tone layering ─────────

describe('composePromptModifiers — genre/director unchanged, tone additive', () => {
  it('omitting tone reproduces the exact pre-B1-a synergy output (no regression)', () => {
    const { block, hasSynergy } = composePromptModifiers('thriller', 'hitchcock');
    assert.equal(hasSynergy, true);
    assert.equal(block, SYNERGY_OVERRIDES.thriller_hitchcock!.combinedInstruction);
  });

  it('omitting tone reproduces the exact pre-B1-a non-synergy output (no regression)', () => {
    const { block, hasSynergy } = composePromptModifiers('drama', undefined);
    assert.equal(hasSynergy, false);
    assert.equal(block, genrePromptBlock('drama'));
  });

  it('fire: supplying a tone appends its instruction block after a synergy override', () => {
    const { block } = composePromptModifiers('thriller', 'hitchcock', 'bleak');
    assert.ok(block.startsWith(SYNERGY_OVERRIDES.thriller_hitchcock!.combinedInstruction));
    assert.match(block, /TONE — BLEAK/);
  });

  it('fire: supplying a tone appends its instruction block in the non-synergy path', () => {
    const { block } = composePromptModifiers('drama', undefined, 'melancholic');
    assert.match(block, /TONE — MELANCHOLIC/);
  });

  it('no-fire: an unset tone never introduces a TONE — block', () => {
    const { block } = composePromptModifiers('drama', undefined, undefined);
    assert.doesNotMatch(block, /TONE —/);
  });
});

// ── GENRE_RULE_MODIFIERS — bounds + coverage ─────────────────────────────────

describe('GENRE_RULE_MODIFIERS — bounds and coverage', () => {
  it('only keys on known genres from GENRE_NAMES', () => {
    const known = new Set(ALL_GENRES);
    for (const genre of Object.keys(GENRE_RULE_MODIFIERS)) {
      assert.ok(known.has(genre as GenreId), `${genre} in GENRE_RULE_MODIFIERS must be a known genre`);
    }
  });

  it('every populated field is a finite number within its documented THRESHOLD_BOUNDS (typo guard)', () => {
    for (const [genre, mod] of Object.entries(GENRE_RULE_MODIFIERS)) {
      for (const [field, value] of Object.entries(mod ?? {})) {
        const key = field as keyof GenreRuleThresholds;
        assert.equal(typeof value, 'number', `${genre}.${field} should be a number`);
        assert.ok(Number.isFinite(value as number), `${genre}.${field} should be finite`);
        const [min, max] = THRESHOLD_BOUNDS[key];
        assert.ok((value as number) >= min && (value as number) <= max, `${genre}.${field}=${value} should be within [${min}, ${max}]`);
      }
    }
  });

  it('B1-a closes the noir gap: noir now has a live pacingPlateauRatio and expositionDumpStreak modifier', () => {
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.noir ?? {}).sort(), ['expositionDumpStreak', 'pacingPlateauRatio']);
    assert.equal(GENRE_RULE_MODIFIERS.noir?.pacingPlateauRatio, 1.1);
    assert.equal(GENRE_RULE_MODIFIERS.noir?.expositionDumpStreak, 2);
  });

  it('B1-a new-genre modifiers are present with their documented values', () => {
    assert.equal(GENRE_RULE_MODIFIERS.action?.energyMonotoneCoV, 0.2);
    assert.equal(GENRE_RULE_MODIFIERS.survival?.energyMonotoneCoV, 0.2);
    assert.equal(GENRE_RULE_MODIFIERS.melodrama?.energyMonotoneCoV, 0.5);
    assert.equal(GENRE_RULE_MODIFIERS.courtroom?.act3ExcessRatio, 1.35);
    assert.equal(GENRE_RULE_MODIFIERS.drama?.act3ExcessRatio, 1.25);
    assert.equal(GENRE_RULE_MODIFIERS.folk_horror?.darkNightSuspenseFloor, 1.6);
  });

  it('romance, sci_fi, and mystery retain exactly their pre-existing single field (no regression)', () => {
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.romance ?? {}), ['weakMidpointPressureFloor']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.sci_fi ?? {}), ['expositionDumpStreak']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.mystery ?? {}), ['act3ExcessRatio']);
  });

  it('genres with no honest rule-threshold argument (never padded) have no GENRE_RULE_MODIFIERS entry', () => {
    for (const genre of ['heist', 'western', 'fantasy', 'crime', 'gothic', 'satire'] as GenreId[]) {
      assert.equal(GENRE_RULE_MODIFIERS[genre], undefined, `${genre} should not have a padded rule modifier`);
    }
  });
});

// ── TONE_REGISTERS — completeness + typo-guard on deltas ─────────────────────

describe('TONE_REGISTERS — completeness and delta plausibility', () => {
  it('has exactly 16 tones, matching TONE_NAME_LIST and TONE_NAMES', () => {
    assert.equal(ALL_TONES.length, 16);
    assert.deepEqual(new Set(TONE_NAME_LIST), new Set(ALL_TONES));
  });

  it('every tone has a substantive, non-empty instruction naming the tone', () => {
    for (const tone of ALL_TONES) {
      const t = TONE_REGISTERS[tone];
      assert.ok(t.instruction.length > 20, `${tone}.instruction should be substantive`);
      assert.match(t.instruction, /^TONE —/, `${tone}.instruction should be labeled as a tone block`);
    }
  });

  it('toneInstructionBlock renders the tone instruction (fire) and empty string for undefined (no-fire)', () => {
    assert.equal(toneInstructionBlock('gritty'), TONE_REGISTERS.gritty.instruction);
    assert.equal(toneInstructionBlock(undefined), '');
  });

  it('every populated tone delta is within half the THRESHOLD_BOUNDS range (catches an accidental 10x typo)', () => {
    for (const [tone, def] of Object.entries(TONE_REGISTERS)) {
      for (const [field, delta] of Object.entries(def.thresholdDeltas ?? {})) {
        const key = field as keyof GenreRuleThresholds;
        const [min, max] = THRESHOLD_BOUNDS[key];
        const cap = (max - min) * 0.5;
        assert.ok(Math.abs(delta as number) <= cap, `${tone}.${field} delta=${delta} exceeds plausible cap ±${cap}`);
      }
    }
  });

  it('some tones deliberately carry no thresholdDeltas (never-padded voice-only entries)', () => {
    assert.equal(TONE_REGISTERS.deadpan.thresholdDeltas, undefined);
    assert.equal(TONE_REGISTERS.satirical.thresholdDeltas, undefined);
    assert.equal(TONE_REGISTERS.irreverent.thresholdDeltas, undefined);
  });
});

// ── composeThresholds — base + delta + clamp math (fire/no-fire) ────────────

describe('composeThresholds — base + delta + clamp', () => {
  it('no-fire: no genre and no tone composes to an empty object', () => {
    assert.deepEqual(composeThresholds(undefined, undefined), {});
  });

  it('no-fire: genre alone reproduces its GENRE_RULE_MODIFIERS values unchanged', () => {
    assert.deepEqual(composeThresholds('thriller', undefined), GENRE_RULE_MODIFIERS.thriller);
  });

  it('fire: tone alone nudges the generic defaults (no genre modifier present)', () => {
    const composed = composeThresholds(undefined, 'bleak');
    assert.equal(composed.darkNightSuspenseFloor, GENERIC_THRESHOLD_DEFAULTS.darkNightSuspenseFloor + 0.5);
    assert.equal(composed.energyMonotoneCoV, Number((GENERIC_THRESHOLD_DEFAULTS.energyMonotoneCoV - 0.05).toFixed(2)));
  });

  it('fire: genre + tone compose additively within bounds (no clamp engaged)', () => {
    const composed = composeThresholds('horror', 'hopeful');
    // horror darkNightSuspenseFloor 1.5 + hopeful delta -0.4 = 1.1, well within [0, 2.0]
    assert.equal(composed.darkNightSuspenseFloor, 1.1);
  });

  it('fire: genre + tone sum exceeds THRESHOLD_BOUNDS max and is clamped', () => {
    // folk_horror darkNightSuspenseFloor 1.6 + bleak delta +0.5 = 2.1, but the
    // bound's max is 2.0 — this must clamp down to exactly 2.0, not 2.1.
    const composed = composeThresholds('folk_horror', 'bleak');
    assert.equal(composed.darkNightSuspenseFloor, 2.0);
  });

  it('clampThreshold fires (clamps) when a raw value is far outside bounds', () => {
    assert.equal(clampThreshold('energyMonotoneCoV', 5), 0.9);
    assert.equal(clampThreshold('energyMonotoneCoV', -3), 0.05);
    assert.equal(clampThreshold('expositionDumpStreak', 100), 6);
  });

  it('clampThreshold does not fire (no clamp) when a raw value is already within bounds', () => {
    assert.equal(clampThreshold('energyMonotoneCoV', 0.4), 0.4);
    assert.equal(clampThreshold('pacingPlateauRatio', 1.2), 1.2);
  });

  it('a field neither genre nor tone touches stays absent from the composed result', () => {
    // noir has no weakMidpointPressureFloor entry and no tone here touches it.
    const composed = composeThresholds('noir', 'gritty');
    assert.equal(composed.weakMidpointPressureFloor, undefined);
  });
});

// ── POST /api/story-tone — HTTP route validation (mirrors tests/routes/config.test.ts) ──

describe('routes/config — POST /api/story-tone (B1-a)', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('accepts a known tone with 200 and echoes it back', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), tone: 'bleak' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.tone, 'bleak');
  });

  it('rejects an unknown tone with 400 (zod validation against TONE_NAME_LIST)', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), tone: 'not-a-real-tone' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(typeof body.error, 'string');
  });

  it('rejects a missing tone field with 400', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId() }),
    });
    assert.equal(res.status, 400);
  });

  it('persists per-session and is readable back from GET /api/story-config', async () => {
    const sid = freshSessionId();
    const postRes = await fetch(`${server.baseUrl}/api/story-tone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, tone: 'operatic' }),
    });
    assert.equal(postRes.status, 200);
    const getRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    assert.equal(getRes.status, 200);
    const body = await getRes.json();
    assert.equal(body.story_tone, 'operatic');
  });

  it('GET /api/story-config reports story_tone: null when never set for a fresh session', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    const body = await res.json();
    assert.equal(body.story_tone, null);
  });
});

// ── POST /api/story-genre — expanded roster flows through the existing route ─

describe('routes/config — POST /api/story-genre accepts the expanded 28-genre roster', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });

  it('accepts a newly-added B1-a genre (heist) with 200', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/story-genre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, genre: 'heist' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.genre, 'heist');
    const getRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    const getBody = await getRes.json();
    assert.equal(getBody.story_genre, 'heist');
  });

  it('still rejects an unknown genre with 400 (no regression to the inline validation)', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-genre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), genre: 'not-a-real-genre' }),
    });
    assert.equal(res.status, 400);
  });

  it('still accepts one of the 8 original genres with 200 (no regression)', async () => {
    const res = await fetch(`${server.baseUrl}/api/story-genre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: freshSessionId(), genre: 'noir' }),
    });
    assert.equal(res.status, 200);
  });
});
