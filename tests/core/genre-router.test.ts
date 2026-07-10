// B1-a — Genre Engine Expansion: tests for server/lib/genre-router.ts's
// expanded genre roster (8 original + 20 new = 28), the new tone-register
// axis (composeThresholds), the genreRules structural-contract surface
// (genrePromiseBlock), and the new POST /api/story-tone route.
//
// Genre-completion wave: extends the above to the full 47-genre / 24-tone
// roster (28 + 19 new genres, 16 + 8 new tones). New assertions added
// newest-first below the B1-a ones they extend: roster-size bumps, a
// byte-identity hash pin over all 28 pre-existing GENRE_MODIFIERS entries
// (extends the old thriller/mystery literal spot-check to full coverage —
// see "byte-identity pin" below), completeness/distinctness checks that now
// run over all 47 genres via the generic ALL_GENRES loops already in place,
// and pins for the 8 new tone deltas / 6 new genre-conditioned modifiers.
//
// Route-level tests reuse tests/routes/helpers.ts's real-Express-app harness
// (see tests/routes/config.test.ts for the pattern this mirrors) so the zod
// validation on the new route is exercised through actual HTTP, not just the
// schema in isolation.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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

// The 20 genres the B1-a wave added (8 original + 20 = 28 pre-existing).
const B1A_20: GenreId[] = [
  'action', 'adventure', 'crime', 'fantasy', 'western', 'war', 'historical',
  'biopic', 'musical', 'family', 'documentary_style', 'heist', 'courtroom',
  'survival', 'coming_of_age', 'satire', 'folk_horror', 'cyberpunk', 'gothic',
  'melodrama',
];

// All 28 genres that existed before this wave — byte-identity is pinned
// below via PRE_EXISTING_28_HASHES so this wave's additions cannot silently
// alter any of them.
const PRE_EXISTING_28: GenreId[] = [...ORIGINAL_8, ...B1A_20];

// The 19 new genres this genre-completion wave adds (28 + 19 = 47 total).
const NEW_19: GenreId[] = [
  'dark_comedy', 'romantic_comedy', 'spy_espionage', 'gangster',
  'political_thriller', 'psychological_thriller', 'police_procedural',
  'cosmic_horror', 'slasher', 'space_opera', 'time_travel',
  'post_apocalyptic', 'urban_fantasy', 'sports_drama', 'disaster',
  'road_movie', 'prison_drama', 'noir_comedy', 'superhero',
];

// ── GENRE_MODIFIERS — completeness across the expanded roster ───────────────

describe('GENRE_MODIFIERS — roster size and completeness', () => {
  it('expands to 47 total genres (28 pre-existing + 19 new)', () => {
    assert.equal(ALL_GENRES.length, 47);
    assert.equal(PRE_EXISTING_28.length, 28);
    assert.equal(NEW_19.length, 19);
    for (const g of PRE_EXISTING_28) assert.ok(ALL_GENRES.includes(g), `${g} must still be present`);
    for (const g of NEW_19) assert.ok(ALL_GENRES.includes(g), `${g} must be present`);
    // No overlap and no duplicate between the two cohorts.
    assert.equal(new Set([...PRE_EXISTING_28, ...NEW_19]).size, 47);
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

  // Genre-completion wave: byte-identity pin extended from the 2-genre
  // literal spot-check above to full coverage of all 28 pre-existing
  // entries. A SHA-256 hash of each entry's exact JSON content is pinned so
  // that ANY byte-level change to a pre-existing genre's toneInstruction,
  // register, forbiddenCliches, emotionalRegister, or genreRules — however
  // small — fails this test, while adding entirely new genres (which do not
  // touch these hashes) does not.
  it('all 28 pre-existing GENRE_MODIFIERS entries are byte-identical to their pre-wave content (hash pin)', () => {
    const PRE_EXISTING_28_HASHES: Record<string, string> = {
      thriller: '5a64896024377e81b673dde6a3db4a52dd4cb55f38d093bf6c4165ed578d4e80',
      horror: '903f5cd4d1814385261f683938ed98cb16d57c64faa95149210abf34acafe4b8',
      drama: '5aeb4ed82d24dee5f0689eb26a5bfb0ff55b2c663f326c7063f1eb222d32f646',
      comedy: 'aed14716750de13fc1afbd6f9c1e3d440412f3fbc5413d368e6ce3ce6ed84961',
      romance: '2cbbdcf344b5ea028458afbef2ead2860cf8ecaf4b8925c8733b538a28732693',
      sci_fi: 'a545981fda7ee4064f3f1a127d64f60d7afed03e76b7d5f730286ffe8e40539f',
      noir: '8284283bb2efdd93fd286d38c1fccfb0a9d0a13ba85d45b66b71ac16460d9078',
      mystery: 'ab18e11bd7f69e21aef8ce8aedfaf47a839ede582d636724f1c095906530a55f',
      action: '7e4c3eb9c5639196f923f51455bc4aaaec8d6fbcd571e1f616a0ea909c9b63b8',
      adventure: '4b2ed8b7a1d50824b4c0fa60612bb123444910148d129546043802e9286b0b83',
      crime: 'ef17d48ae5615f4ab971d6554b48c908bd0f0d76afdce70aa07589eba164cde2',
      fantasy: 'e10e1ba9a2d2abd667a258af527e4514e68a5bed632ea3656a49d81a83726b41',
      western: 'cfe5dc3de688293852f03eaacbd9b9f983ea16e9aa729341bb8e94cd9a6114ca',
      war: 'e1e1b98f789d8e84ac869f5660b4b366a4dd0b1f16d8b4fa30be0a6a8ecd4390',
      historical: '9301173388f38cc2a79b7e3646213a5a40409839050c919f44935d44be465886',
      biopic: '82ec68a379393ea25b9cf58f600d6bb08595c40512732d4b03ecc8499a0db476',
      musical: '0f1dd4c014a037066e014ce91f9f7a349ba312d4d4b5c427417f109510082182',
      family: 'daa7e563f9edf6c4a22161a41618cf7ca8bc2a17e295b0085258d4d71c8c2b88',
      documentary_style: '289ab97f42a5ed10302e44898f7703a78031f9c17a11b169f0e3fdeaaedd7b03',
      heist: '3e50fc388594682d0848ddc7957cab9a2aea9be6349e6220cf2457a5bf37dde5',
      courtroom: '9ae0f22141246b78b63aa45fc11653eb667478481459432804a86c0767b2df78',
      survival: '42cf3e1817e54661c173c0c138fe555e0df82889c95f62beb742e24e3fe5af8e',
      coming_of_age: '021474af106cf0b77c1461e703ebe4b82752a0589c63eb2d9a92bf3ec0dc6447',
      satire: '9e74c965b64109bf0bc319f1d1ce7545eade00015e672c2dc7c64c0db1a3b47d',
      folk_horror: '3b8021a61fd5250a9207bc208db70b19857d8c215432878dcd7d44d87cfe6f0e',
      cyberpunk: '3af4ebd92fc8d9f40823bb03443f3bde20c77c277047efc14824e86b134860e6',
      gothic: '931c79a5c4943f496767e7119a031bc64be31fe562467431f408254f9b4e86b0',
      melodrama: '181494c055b3b8e08a0956dfcf1a7d57ee95d2e9fc3278505118217e1ab4e086',
    };
    assert.equal(Object.keys(PRE_EXISTING_28_HASHES).length, 28);
    for (const genre of PRE_EXISTING_28) {
      const actual = createHash('sha256').update(JSON.stringify(GENRE_MODIFIERS[genre])).digest('hex');
      assert.equal(actual, PRE_EXISTING_28_HASHES[genre], `${genre}'s GENRE_MODIFIERS entry must be byte-identical to its pre-wave content`);
    }
  });

  // Distinctness spot-check (task requirement): no two genres — old or new
  // — may share an identical genreRules contract. This is what makes a
  // candidate genre a genuine addition rather than a relabeled duplicate
  // (see the module header's note on mockumentary/epic_fantasy/k_drama/
  // telenovela, which were declined for exactly this reason).
  it('no two genres share an identical genreRules contract', () => {
    const seen = new Map<string, GenreId>();
    for (const genre of ALL_GENRES) {
      const key = JSON.stringify(GENRE_MODIFIERS[genre].genreRules);
      const prior = seen.get(key);
      assert.equal(prior, undefined, `${genre} has a genreRules contract identical to ${prior}'s`);
      seen.set(key, genre);
    }
  });

  it('the 19 new genres each have a genreRules contract distinguishable from every genre that existed before this wave', () => {
    for (const genre of NEW_19) {
      const newKey = JSON.stringify(GENRE_MODIFIERS[genre].genreRules);
      for (const priorGenre of PRE_EXISTING_28) {
        const priorKey = JSON.stringify(GENRE_MODIFIERS[priorGenre].genreRules);
        assert.notEqual(newKey, priorKey, `${genre} must not duplicate ${priorGenre}'s genreRules`);
      }
    }
  });
});

// ── genrePromptBlock ──────────────────────────────────────────────────────────

describe('genre-router — genrePromptBlock', () => {
  it('returns empty string when genre is undefined', () => {
    assert.equal(genrePromptBlock(undefined), '');
  });

  it('produces a tone instruction, register, and cliché list for every one of the 47 genres', () => {
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

  // Genre-completion wave spot-checks.
  it('slasher promise block names its learnable-pattern contract content', () => {
    const block = genrePromiseBlock('slasher');
    assert.match(block, /learn and anticipate/);
    assert.match(block, /victim stupidity as the sole driver/);
  });

  it('time_travel promise block flags rules stated before they bind and paradox-by-vibes as forbidden', () => {
    const block = genrePromiseBlock('time_travel');
    assert.match(block, /rules of the time mechanism before the plot depends on them/);
    assert.match(block, /vague mood or hand-waving instead of the stated rules/);
  });

  it('police_procedural promise block names its evidence-chain-custody contract', () => {
    const block = genrePromiseBlock('police_procedural');
    assert.match(block, /procedurally sound chain of evidence/);
    assert.match(block, /warrantless search or an implausible instant database match/);
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
    for (const genre of [
      'heist', 'western', 'fantasy', 'crime', 'gothic', 'satire',
      // Genre-completion wave: 13 of the 19 new genres deliberately have no
      // modifier either — the never-padded discipline extends to the new
      // roster exactly as it did to the original one.
      'dark_comedy', 'romantic_comedy', 'spy_espionage', 'political_thriller',
      'police_procedural', 'cosmic_horror', 'space_opera', 'time_travel',
      'post_apocalyptic', 'urban_fantasy', 'sports_drama', 'prison_drama',
      'noir_comedy',
    ] as GenreId[]) {
      assert.equal(GENRE_RULE_MODIFIERS[genre], undefined, `${genre} should not have a padded rule modifier`);
    }
  });

  // Genre-completion wave: the 6 new genres that DO get a live modifier,
  // each with a one-line craft argument documented at its definition site.
  it('genre-completion wave new-genre modifiers are present with their documented values', () => {
    assert.equal(GENRE_RULE_MODIFIERS.psychological_thriller?.pacingPlateauRatio, 1.1);
    assert.equal(GENRE_RULE_MODIFIERS.slasher?.darkNightSuspenseFloor, 1.7);
    assert.equal(GENRE_RULE_MODIFIERS.gangster?.act3ExcessRatio, 1.25);
    assert.equal(GENRE_RULE_MODIFIERS.disaster?.energyMonotoneCoV, 0.42);
    assert.equal(GENRE_RULE_MODIFIERS.road_movie?.energyMonotoneCoV, 0.2);
    assert.equal(GENRE_RULE_MODIFIERS.superhero?.act3ExcessRatio, 1.3);
  });

  it('each of the 6 new genre modifiers carries exactly its one documented field (no extra padding)', () => {
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.psychological_thriller ?? {}), ['pacingPlateauRatio']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.slasher ?? {}), ['darkNightSuspenseFloor']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.gangster ?? {}), ['act3ExcessRatio']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.disaster ?? {}), ['energyMonotoneCoV']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.road_movie ?? {}), ['energyMonotoneCoV']);
    assert.deepEqual(Object.keys(GENRE_RULE_MODIFIERS.superhero ?? {}), ['act3ExcessRatio']);
  });
});

// ── TONE_REGISTERS — completeness + typo-guard on deltas ─────────────────────

describe('TONE_REGISTERS — completeness and delta plausibility', () => {
  it('has exactly 24 tones, matching TONE_NAME_LIST and TONE_NAMES (16 pre-existing + 8 new)', () => {
    assert.equal(ALL_TONES.length, 24);
    assert.deepEqual(new Set(TONE_NAME_LIST), new Set(ALL_TONES));
    const NEW_8_TONES: ToneName[] = [
      'dread_driven', 'cathartic', 'nihilistic', 'spiritual', 'chaotic',
      'romantic', 'maximalist', 'emotional',
    ];
    for (const t of NEW_8_TONES) assert.ok(ALL_TONES.includes(t), `${t} must be present`);
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
    // Genre-completion wave: 2 of the 8 new tones carry no delta either,
    // for the same honest reason.
    assert.equal(TONE_REGISTERS.spiritual.thresholdDeltas, undefined);
    assert.equal(TONE_REGISTERS.emotional.thresholdDeltas, undefined);
  });

  // Genre-completion wave: pin the 6 new tones that DO carry a delta.
  it('the 6 new tones with a numeric argument carry their documented delta', () => {
    assert.equal(TONE_REGISTERS.dread_driven.thresholdDeltas?.darkNightSuspenseFloor, 0.4);
    assert.equal(TONE_REGISTERS.cathartic.thresholdDeltas?.act3ExcessRatio, 0.25);
    assert.equal(TONE_REGISTERS.nihilistic.thresholdDeltas?.energyMonotoneCoV, -0.1);
    assert.equal(TONE_REGISTERS.chaotic.thresholdDeltas?.energyMonotoneCoV, 0.15);
    assert.equal(TONE_REGISTERS.romantic.thresholdDeltas?.weakMidpointPressureFloor, -0.3);
    assert.equal(TONE_REGISTERS.maximalist.thresholdDeltas?.act3ExcessRatio, 0.35);
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

  // Genre-completion wave — fire/no-fire pair for a new genre + new tone.
  it('fire: a new genre + new tone sum exceeds THRESHOLD_BOUNDS max and is clamped', () => {
    // slasher darkNightSuspenseFloor 1.7 + dread_driven delta +0.4 = 2.1,
    // but the bound's max is 2.0 — this must clamp down to exactly 2.0.
    const composed = composeThresholds('slasher', 'dread_driven');
    assert.equal(composed.darkNightSuspenseFloor, 2.0);
  });

  it('no-fire: a new genre alone (no tone) reproduces its GENRE_RULE_MODIFIERS value unchanged', () => {
    const composed = composeThresholds('slasher', undefined);
    assert.deepEqual(composed, GENRE_RULE_MODIFIERS.slasher);
    assert.equal(composed.darkNightSuspenseFloor, 1.7);
  });

  it('fire: a new tone alone nudges the generic default (no genre modifier present)', () => {
    const composed = composeThresholds(undefined, 'chaotic');
    assert.equal(composed.energyMonotoneCoV, Number((GENERIC_THRESHOLD_DEFAULTS.energyMonotoneCoV + 0.15).toFixed(2)));
  });

  it('no-fire: an unrecognized-by-this-field new tone leaves an untouched field absent', () => {
    // chaotic only carries an energyMonotoneCoV delta; darkNightSuspenseFloor
    // must stay absent when no genre supplies it either.
    const composed = composeThresholds(undefined, 'chaotic');
    assert.equal(composed.darkNightSuspenseFloor, undefined);
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

describe('routes/config — POST /api/story-genre accepts the expanded 47-genre roster', () => {
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

  it('accepts a genre-completion-wave genre (slasher) with 200 (route validates dynamically against GENRE_NAMES)', async () => {
    const sid = freshSessionId();
    const res = await fetch(`${server.baseUrl}/api/story-genre`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, genre: 'slasher' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.genre, 'slasher');
    const getRes = await fetch(`${server.baseUrl}/api/story-config?sessionId=${sid}`);
    const getBody = await getRes.json();
    assert.equal(getBody.story_genre, 'slasher');
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

// ── I1-a — composePromptModifiers: genrePromiseBlock opt-in ─────────────────

describe('composePromptModifiers — includeGenrePromise layers the structural contract (I1-a)', () => {
  it('fire: promise lines appear when a genre with genreRules is set and includeGenrePromise is true', () => {
    const { block } = composePromptModifiers('drama', undefined, undefined, true);
    assert.match(block, /GENRE PROMISE — DRAMA/);
    assert.match(block, /REQUIRED:/);
    assert.match(block, /FORBIDDEN SHORTCUTS:/);
    assert.ok(block.startsWith(genrePromptBlock('drama')), 'voice block still leads; promise follows');
  });

  it('fire: the promise block survives a synergy override (structural contract binds even when the voice is replaced)', () => {
    const { block, hasSynergy } = composePromptModifiers('thriller', 'hitchcock', 'bleak', true);
    assert.equal(hasSynergy, true);
    assert.ok(block.startsWith(SYNERGY_OVERRIDES.thriller_hitchcock!.combinedInstruction));
    assert.match(block, /GENRE PROMISE — THRILLER/);
    // Tone stays last: mood layered on top of contract.
    assert.ok(block.indexOf('GENRE PROMISE — THRILLER') < block.indexOf('TONE — BLEAK'));
  });

  it('no-fire: includeGenrePromise defaults to false — existing call sites stay byte-identical', () => {
    const { block } = composePromptModifiers('drama', undefined);
    assert.doesNotMatch(block, /GENRE PROMISE/);
    assert.equal(block, genrePromptBlock('drama'));
  });

  it('no-fire: includeGenrePromise with no genre set adds nothing', () => {
    const { block } = composePromptModifiers(undefined, 'hitchcock', undefined, true);
    assert.doesNotMatch(block, /GENRE PROMISE/);
  });
});
