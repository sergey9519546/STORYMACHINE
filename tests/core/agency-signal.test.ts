// Agency signal — tests for the UNWIRED P1 candidate in
// server/nvm/analyze/agency-signal.ts (see that file's header for the full
// disclaimer: not measured on the real 761-script corpus, not wired into
// health/verdict/grade/PROTAGONIST_PASSIVITY_CLIMAX/PASSIVE_ACT3_INTENTION,
// responds to detector defects D1 and D2 in
// docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md).
//
// Conventions: node:test + assert/strict, matching
// tests/core/reversal-detection.test.ts (the sibling P1 module this one
// follows structurally) and tests/core/truth-extraction.test.ts (the
// fountain()-through-the-real-analyzer style for text-derived fixtures).
//
// Fixture provenance: tests/fixtures/agency-signal/the-second-key.fountain is
// a standalone, decoupled copy of src/lib/sample-script.ts's `fountain`
// export ("The Second Key"), taken 2026-08-04 — see that fixture file's own
// header for why it is a copy rather than a reference into src/lib/
// sample-script.ts or demo/corpus/sample-script.fountain.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectSceneAgency,
  detectPeakAgency,
  detectAct3Agency,
  computeD1AgencyDelta,
  computeD2AgencyDelta,
} from '../../server/nvm/analyze/agency-signal.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { makeSceneRecord } from '../passes/helpers.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

const fixturesDir = path.resolve(import.meta.dirname, '../fixtures/agency-signal');
const corpusDir = path.resolve(import.meta.dirname, '../../data/screenplays');

function fountain(...scenes: string[][]): string {
  return scenes.map(s => s.join('\n')).join('\n\n');
}

// ── Canonical fixture: the vault scene (D1/D2's own worked example) ───────

describe('detectPeakAgency / computeD1AgencyDelta — canonical D1 fixture (the vault scene)', () => {
  const text = fs.readFileSync(path.join(fixturesDir, 'the-second-key.fountain'), 'utf8');
  const { records } = analyzeFountainText(text);

  it('parses to the expected 14 scenes, unaffected by the fixture file\'s provenance boneyard comment', () => {
    assert.equal(records.length, 14);
    assert.equal(records[0].slug, 'INT. PAWNSHOP BACK ROOM - NIGHT');
  });

  // D1's worked example quotes "suspense 3.0" at this scene. The SCENE is
  // unchanged; the MAGNITUDE dropped to 2.0 on 2026-09-04 when `dark` left
  // DANGER_TENSION_WORDS. This fixture's peak line is
  //   "Vance steps out of the dark, gun raised."
  // — `gun` (kept, unambiguous peril) and `dark` (dropped, measured 0/15 peril
  // readings across the 42 shipped scripts) were both counting, so removing
  // one costs exactly one point. D1's claim is about WHICH scene the engine
  // calls the peak and whether it reads the protagonist as passive there, and
  // both are asserted below and unchanged.
  it('the peak-suspense scene is sceneIdx 12 (the 13th scene, "VAULT - CONTINUOUS"), matching D1\'s worked example', () => {
    const peak = detectPeakAgency(records, 'June');
    assert.deepEqual(peak.peakSceneIdxs, [12]);
    assert.equal(records[12].suspenseDelta, 2);
    assert.ok(
      records.every((r, i) => i === 12 || r.suspenseDelta <= records[12].suspenseDelta),
      'scene 12 must still be the strict maximum of the suspense channel',
    );
  });

  it('legacy PROTAGONIST_PASSIVITY_CLIMAX predicate calls the peak scene passive, reproducing D1 exactly', () => {
    const delta = computeD1AgencyDelta(records, 'June');
    assert.equal(delta.legacyPassiveAtPeak, true, 'D1 states emotionalShift==neutral && !clockRaised && seededClueIds.length===0 at the peak scene');
  });

  it('detectPeakAgency finds June decisively acting at the peak scene the legacy predicate calls passive', () => {
    const peak = detectPeakAgency(records, 'June');
    assert.equal(peak.anyAgencyAtPeak, true);
    const signal = peak.signals[0];
    assert.equal(signal.evidenceKind, 'decisive_action');
    assert.match(signal.evidence!, /June turns the brass teeth/i);
  });

  it('computeD1AgencyDelta reports disagreement: legacy says passive, this module finds agency', () => {
    const delta = computeD1AgencyDelta(records, 'June');
    assert.equal(delta.legacyPassiveAtPeak, true);
    assert.equal(delta.detectedAgencyAtPeak, true);
    assert.equal(delta.disagreement, true);
  });
});

describe('detectAct3Agency / computeD2AgencyDelta — canonical D2 fixture (the same script\'s final act)', () => {
  const text = fs.readFileSync(path.join(fixturesDir, 'the-second-key.fountain'), 'utf8');
  const { records } = analyzeFountainText(text);

  it('the default 0.25 fraction on a 14-scene script yields exactly D2\'s own "4 Act 3 scenes" (sceneIdx 10-13)', () => {
    const act3 = detectAct3Agency(records, 'June');
    assert.deepEqual(act3.actSceneIdxs, [10, 11, 12, 13]);
    assert.equal(act3.sceneCount, 4);
  });

  it('legacy predicate calls EVERY Act 3 scene passive, reproducing D2\'s "across all 4 Act 3 scenes... initiates no action" exactly', () => {
    const delta = computeD2AgencyDelta(records, 'June');
    assert.equal(delta.legacyAllPassiveAct3, true);
    assert.equal(delta.act3SceneCount, 4);
  });

  it('detectAct3Agency finds June initiating in 2 of the 4 scenes the legacy predicate calls uniformly passive (STUDY: "works a hidden panel"; VAULT: "turns the brass teeth") — the ANTECHAMBER scene is a documented miss (see file header CANNOT list: its decisive line never made it into visualBeats/dramaticTurn), and INTERROGATION is a genuine spectator beat ("sits alone")', () => {
    const act3 = detectAct3Agency(records, 'June');
    assert.equal(act3.initiativeCount, 2);
    assert.equal(act3.initiativeRate, 0.5);
    const bySceneIdx = new Map(act3.signals.map(s => [s.sceneIdx, s]));
    assert.equal(bySceneIdx.get(10)!.evidenceKind, 'decisive_action');
    assert.equal(bySceneIdx.get(11)!.evidenceKind, null, 'antechamber: documented gap, not a false negative bug');
    assert.equal(bySceneIdx.get(12)!.evidenceKind, 'decisive_action');
    assert.equal(bySceneIdx.get(13)!.evidenceKind, 'spectator_verb');
  });

  it('computeD2AgencyDelta reports disagreement: legacy says every Act 3 scene is passive, this module finds initiative in 2', () => {
    const delta = computeD2AgencyDelta(records, 'June');
    assert.equal(delta.legacyAllPassiveAct3, true);
    assert.equal(delta.detectedInitiativeCount, 2);
    assert.equal(delta.disagreement, true);
  });
});

// ── Synthetic fixture: clear agency at a legacy-shaped-passive peak ───────
// D1's own fix note: "fixtures: positive = genuinely spectator protagonists
// at the peak; negative = silent but decisive actors." This is a SECOND,
// independent "negative" (decisive-actor) case beyond the canonical vault
// scene, built synthetically so the legacy-passive SHAPE (neutral emotion,
// no clock, no clue) is controlled deliberately rather than inherited.

describe('detectPeakAgency — synthetic "clear agency" fixture (D1\'s decisive-actor shape, controlled)', () => {
  const text = fountain(
    ['INT. SAFEHOUSE - NIGHT', '', 'Kestrel checks a folded map by lamplight, quiet, methodical.'],
    ['INT. STAIRWELL - NIGHT', '', 'Footsteps echo somewhere below, faint and even.'],
    ['EXT. ROOFTOP LEDGE - NIGHT', '', 'Cornered against the ledge, Kestrel grabs the frayed rope and hauls herself over the wall while gunfire cracks below.'],
  );
  const { records } = analyzeFountainText(text);

  it('the peak scene matches the legacy passivity shape exactly (neutral, no clock, no clue)', () => {
    assert.deepEqual(detectPeakAgency(records, 'Kestrel').peakSceneIdxs, [2]);
    assert.equal(records[2].emotionalShift, 'neutral');
    assert.equal(records[2].clockRaised, false);
    assert.deepEqual(records[2].seededClueIds, []);
  });

  it('detects Kestrel as the decisive actor despite the fronted participial phrase ("Cornered against the ledge, Kestrel grabs...")', () => {
    const peak = detectPeakAgency(records, 'Kestrel');
    assert.equal(peak.anyAgencyAtPeak, true);
    assert.equal(peak.allSpectatorAtPeak, false);
    assert.equal(peak.signals[0].evidenceKind, 'decisive_action');
  });

  it('computeD1AgencyDelta disagrees with the legacy predicate here too', () => {
    const delta = computeD1AgencyDelta(records, 'Kestrel');
    assert.equal(delta.legacyPassiveAtPeak, true);
    assert.equal(delta.disagreement, true);
  });
});

// ── Synthetic fixture: genuinely spectator protagonist at the peak ────────
// D1's own "positive" fixture shape: legacy correctly calls this passive,
// and this module should AGREE (no disagreement) — a true positive for the
// existing rule, not a defect.

describe('detectPeakAgency — synthetic "genuinely spectator protagonist" fixture (D1\'s positive/true-passivity shape)', () => {
  const text = fountain(
    ['INT. SAFEHOUSE - NIGHT', '', 'Kestrel checks a folded map by lamplight, quiet, methodical.'],
    ['INT. STAIRWELL - NIGHT', '', 'Footsteps echo somewhere below, faint and even.'],
    ['EXT. WAREHOUSE ROOF - NIGHT', '', 'Kestrel watches from the shadows. Silas grabs the ledger and bolts for the fire escape as gunfire cracks below.'],
  );
  const { records } = analyzeFountainText(text);

  it('the peak scene also matches the legacy passivity shape', () => {
    assert.deepEqual(detectPeakAgency(records, 'Kestrel').peakSceneIdxs, [2]);
    assert.equal(records[2].emotionalShift, 'neutral');
    assert.equal(records[2].clockRaised, false);
  });

  it('finds Kestrel a spectator, not a decisive actor — Silas\'s "grabs" (a separate sentence) is correctly NOT credited to Kestrel', () => {
    const peak = detectPeakAgency(records, 'Kestrel');
    assert.equal(peak.anyAgencyAtPeak, false);
    assert.equal(peak.allSpectatorAtPeak, true);
    assert.equal(peak.signals[0].evidenceKind, 'spectator_verb');
    assert.match(peak.signals[0].evidence!, /Kestrel watches from the shadows/);
  });

  it('computeD1AgencyDelta agrees with the legacy predicate here (no disagreement) — this rule firing on this scene is CORRECT', () => {
    const delta = computeD1AgencyDelta(records, 'Kestrel');
    assert.equal(delta.legacyPassiveAtPeak, true);
    assert.equal(delta.detectedAgencyAtPeak, false);
    assert.equal(delta.disagreement, false);
  });
});

// ── Near-miss negatives: protagonist present but NOT the decisive subject ─

describe('detectSceneAgency — near-miss negatives (protagonist present, correctly not credited)', () => {
  it('passive voice ("Kestrel is grabbed by Silas") does not credit Kestrel with the decisive verb', () => {
    const text = fountain(['INT. VAULT - NIGHT', '', 'Kestrel is grabbed by Silas and shoved toward the door.']);
    const { records } = analyzeFountainText(text);
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.hasDecisiveAction, false);
    assert.equal(signal.protagonistMentioned, true, 'sanity check: Kestrel is named in the text, just correctly not credited');
  });

  it('active voice with the protagonist as grammatical object ("Silas grabs Kestrel") does not credit Kestrel', () => {
    const text = fountain(['INT. VAULT - NIGHT', '', 'Silas grabs Kestrel and shoves her toward the door.']);
    const { records } = analyzeFountainText(text);
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.hasDecisiveAction, false);
    assert.equal(signal.protagonistMentioned, true);
  });

  it('DOCUMENTED RESIDUAL LIMITATION: a decisive verb attached to a DIFFERENT character within the SAME unpunctuated clause as the protagonist\'s spectator verb ("Kestrel watches ... as Silas grabs ...") IS misattributed as Kestrel\'s own decisive action — this is the exact SOURCE 1 CANNOT case the file header names, and it is asserted here (not hidden) precisely because splitting THIS clause requires punctuation this module has no other way to detect', () => {
    const text = fountain(['EXT. WAREHOUSE ROOF - NIGHT', '', 'Kestrel watches from the shadows as Silas grabs the ledger and bolts for the fire escape while gunfire cracks below.']);
    const { records } = analyzeFountainText(text);
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.hasDecisiveAction, true, 'known false positive — see file header SOURCE 1 CANNOT list');
  });
});

// ── Channel 2: dialogue-initiative via powerHolder ─────────────────────────

describe('detectSceneAgency — dialogue initiative (powerHolder channel)', () => {
  it('a protagonist identified as powerHolder fires dialogue_initiative even with no decisive-verb action text', () => {
    const text = fountain([
      'INT. OFFICE - DAY', '',
      'Kestrel and Silas sit across a bare desk.', '',
      'KESTREL', 'Tell me where the ledger is. Now. Answer me.', '',
      'SILAS', "I don't know what you're talking about.", '',
      'KESTREL', "Don't lie to me. Give me the ledger.",
    ]);
    const { records } = analyzeFountainText(text);
    assert.equal(records[0].powerHolder, 'KESTREL');
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.hasDialogueInitiative, true);
    // Priority order: decisive > dialogue initiative > spectator. "sit" (a
    // SPECTATOR_VERBS hit from the scene's own action line, "Kestrel and
    // Silas sit across a bare desk") is also present here, exercising that
    // dialogue_initiative correctly wins the priority order over a
    // simultaneously-true hasSpectatorVerb.
    assert.equal(signal.hasSpectatorVerb, true, 'sanity check on the fixture: both signals are true here');
    assert.equal(signal.evidenceKind, 'dialogue_initiative');
    assert.equal(signal.evidence, 'powerHolder: KESTREL');
  });

  it('a scene with no powerHolder (solo speaker) does not fire dialogue_initiative — a documented SOURCE 2 CANNOT case', () => {
    const record = makeSceneRecord(0, { powerHolder: null });
    const signal = detectSceneAgency(record, 'Kestrel');
    assert.equal(signal.hasDialogueInitiative, false);
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────────

describe('detectSceneAgency / detectPeakAgency / detectAct3Agency — edge cases', () => {
  it('empty script: detectPeakAgency and detectAct3Agency return safe empty defaults, no crash', () => {
    const { records } = analyzeFountainText('');
    assert.equal(records.length, 0);
    const peak = detectPeakAgency(records, 'Kestrel');
    assert.deepEqual(peak, { peakSceneIdxs: [], signals: [], anyAgencyAtPeak: false, allSpectatorAtPeak: false });
    const act3 = detectAct3Agency(records, 'Kestrel');
    assert.deepEqual(act3, { actSceneIdxs: [], signals: [], initiativeCount: 0, sceneCount: 0, initiativeRate: null });
  });

  it('empty script: computeD1AgencyDelta / computeD2AgencyDelta report no disagreement, no crash', () => {
    const { records } = analyzeFountainText('');
    const d1 = computeD1AgencyDelta(records, 'Kestrel');
    assert.deepEqual(d1, { legacyPassiveAtPeak: false, detectedAgencyAtPeak: false, disagreement: false });
    const d2 = computeD2AgencyDelta(records, 'Kestrel');
    assert.deepEqual(d2, { legacyAllPassiveAct3: false, detectedInitiativeCount: 0, act3SceneCount: 0, disagreement: false });
  });

  it('dialogue-only scene (no action lines at all): no crash; protagonistMentioned is false because dialogue text never restates the speaker\'s own name', () => {
    const text = fountain(['INT. OFFICE - DAY', '', 'KESTREL', 'We should leave before anyone notices.', '', 'SILAS', 'Not yet.']);
    const { records } = analyzeFountainText(text);
    assert.deepEqual(records[0].visualBeats, []);
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.hasDecisiveAction, false);
    assert.equal(signal.hasSpectatorVerb, false);
    assert.equal(signal.protagonistMentioned, false);
    assert.equal(signal.evidenceKind, null);
  });

  it('montage (multiple short beats under one slugline): no crash; mundane prep verbs outside both lexicons correctly yield no evidence either way', () => {
    const text = fountain([
      'INT. VARIOUS - MONTAGE', '',
      'Kestrel packs a bag.', '',
      'Kestrel counts cash at a kitchen table.', '',
      'Kestrel checks a map under a streetlamp.',
    ]);
    const { records } = analyzeFountainText(text);
    const signal = detectSceneAgency(records[0], 'Kestrel');
    assert.equal(signal.protagonistMentioned, true, 'Kestrel is named in the montage text');
    assert.equal(signal.hasDecisiveAction, false, '"packs"/"counts"/"checks" are outside this module\'s decisive lexicon');
    assert.equal(signal.hasSpectatorVerb, false, 'also outside the spectator lexicon — this is a real "no evidence" case, not a bug');
    assert.equal(signal.evidenceKind, null);
  });
});

// ── detectAct3Agency windowing (synthetic records, exact control) ─────────

describe('detectAct3Agency — windowing options', () => {
  const records: ScreenplaySceneRecord[] = Array.from({ length: 12 }, (_, i) => makeSceneRecord(i));

  it('default fraction (0.25) on 12 scenes windows the last 3 scenes (Math.ceil(12*0.25)=3)', () => {
    const act3 = detectAct3Agency(records, 'Kestrel');
    assert.deepEqual(act3.actSceneIdxs, [9, 10, 11]);
  });

  it('a custom fraction changes the window size', () => {
    const act3 = detectAct3Agency(records, 'Kestrel', { fraction: 0.5 });
    assert.deepEqual(act3.actSceneIdxs, [6, 7, 8, 9, 10, 11]);
  });

  it('minScenes floors the window on a very short script even when fraction rounds to less', () => {
    const short: ScreenplaySceneRecord[] = Array.from({ length: 3 }, (_, i) => makeSceneRecord(i));
    const act3 = detectAct3Agency(short, 'Kestrel', { fraction: 0.1, minScenes: 2 });
    assert.deepEqual(act3.actSceneIdxs, [1, 2]);
  });

  it('the window never exceeds the total scene count', () => {
    const act3 = detectAct3Agency(records, 'Kestrel', { fraction: 1.5 });
    assert.equal(act3.sceneCount, 12);
  });
});

// ── sceneIdx contract (0-based, per record.sceneIdx, never array position) ─

describe('detectSceneAgency / detectPeakAgency — sceneIdx contract', () => {
  it('reports the record\'s own sceneIdx verbatim, even mismatched against array position', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(7, { suspenseDelta: 5, visualBeats: ['Kestrel grabs the ledge and hauls herself up.'] }),
    ];
    const peak = detectPeakAgency(records, 'Kestrel');
    assert.deepEqual(peak.peakSceneIdxs, [7]);
    assert.equal(peak.signals[0].sceneIdx, 7);
  });
});

// ── Determinism ─────────────────────────────────────────────────────────

describe('agency-signal — determinism', () => {
  it('is deterministic on the canonical vault-scene fixture: repeated calls produce identical results', () => {
    const text = fs.readFileSync(path.join(fixturesDir, 'the-second-key.fountain'), 'utf8');
    const { records } = analyzeFountainText(text);
    assert.deepEqual(detectPeakAgency(records, 'June'), detectPeakAgency(records, 'June'));
    assert.deepEqual(detectAct3Agency(records, 'June'), detectAct3Agency(records, 'June'));
    assert.deepEqual(computeD1AgencyDelta(records, 'June'), computeD1AgencyDelta(records, 'June'));
    assert.deepEqual(computeD2AgencyDelta(records, 'June'), computeD2AgencyDelta(records, 'June'));
  });
});

// ── Runnable discrimination evidence: the 20 tracked CC0 scripts ──────────
// Per CLAUDE.md's quality bar for scoring-signal work: synthetic fire/no-fire
// coverage alone is not enough. This runs detectPeakAgency/detectAct3Agency
// over every real, in-repo CC0 script under data/screenplays/*.fountain
// (protagonist = the most-frequently-speaking character, i.e.
// FountainAnalysis.characters[0] — a reasonable caller-side default; see
// file header) and asserts the MEASURED distribution — this module fires
// selectively (neither always nor never), which is the honest bar for an
// unwired candidate: it should disagree with the legacy predicate on SOME
// real scripts, and agree (or say nothing) on most, not flip a
// switch-nothing/switch-everything result that would suggest either a dead
// detector or an over-firing one.
//
// Table locked from an actual run on 2026-08-04 (data/screenplays/ is a
// fixed, in-repo CC0 corpus of 20 scripts — same files
// tests/core/real-script-corpus.test.ts's local-only, larger sibling corpus
// is NOT gated on; these 20 are already checked into git). If this table
// ever needs to change, it must be because a detection RULE changed (the
// falsifiability property this module's own header claims) — re-measure,
// don't hand-tune the table to match a broken run.
//
// RE-LOCKED 2026-09-04 — CORPUS-INTEGRITY CORRECTION, not a rule change.
// The 2026-08-04 lock measured a CONTAMINATED corpus. Every
// data/screenplays/*.fountain file opened with a `//`-prefixed provenance
// header, and `//` is not Fountain comment syntax (the boneyard is `/* */` —
// src/lib/fountain.ts:110), so parseFountain typed those lines `action` and
// segmentScenes folded them into scene 0. Header phrases like "DEATH-RECALL
// TAG", "stabs NAME to death" and "kills NAME" are DANGER_TENSION_WORDS hits,
// so the metadata raised scene 0's suspenseDelta and made scene 0 the
// peak-suspense scene of scripts whose drama peaks elsewhere. The headers are
// now real `/* */` boneyards (same words, same licence record, invisible to
// the parser) and this table is a fresh measurement of the clean corpus.
//
// The correction is falsifiable and was checked, not assumed: across all 20
// scripts the per-scene suspenseDelta series changed AT SCENE INDEX 0 AND
// NOWHERE ELSE (13 of 20 files moved at index 0; 7 were already 0 there and
// did not move at all). Scene-0 suspense before -> after:
//   chain-of-custody 3->1  close-quarters 4->0  code-blue 3->-1
//   high-voltage 3->1      mise 1->0            quiet-season 1->0
//   red-line 3->0          same-page 1->0       soft-launch 2->1
//   the-defense-rests 1->-1  the-key-under-the-mat 1->0  two-lane 1->0
//   undertow 3->0
// 12 of the 20 rows below therefore moved. The headline shift: the number of
// scripts whose SOLE peak-suspense scene was scene 1 went 9 -> 0, and the
// number whose peak set merely INCLUDES scene 1 went 15 -> 8. Where a script
// now shows every scene as a peak (quiet-season, room-12, same-page) that is
// the honest reading — with the metadata gone those drafts carry no danger
// signal anywhere, so every scene ties at 0.
//
// The aggregate honesty assertions at the bottom of this file did NOT move:
// d1Disagreement is still 1 (mise) and d2Disagreement still 3 (quiet-season,
// the-detour, undertow) — the detector's selectivity claim survives the
// correction, which is the useful thing to know about it.
interface CorpusRow {
  file: string;
  protagonist: string;
  sceneCount: number;
  peakSceneIdxs: number[];
  anyAgencyAtPeak: boolean;
  allSpectatorAtPeak: boolean;
  act3InitiativeCount: number;
  act3SceneCount: number;
  d1Disagreement: boolean;
  d2Disagreement: boolean;
}

// ── RE-MEASURED 2026-09-04 (advice-rule fixes, second re-measurement of the
//    day) ──────────────────────────────────────────────────────────────────
// Six word-sense false positives left DANGER_TENSION_WORDS: run/runs/running,
// shot/shots, dark (fountain-analyzer.ts carries the per-word measurement).
// Those words fed suspenseDelta, suspenseDelta names the peak-suspense scene,
// and this table is keyed on the peak scene — so the table moved again.
// Scene-0 suspense after this change: chain-of-custody 1->0, close-quarters
// 0->0, code-blue -1->-1, counter-offer 0->0, high-voltage 1->1, red-line
// 0->0, soft-launch 1->1, the-defense-rests -1->-1, undertow 0->0.
//
// The visible pattern: where a script's only danger tokens were `dark`/`run`/
// `shot`, every scene now ties at 0 and the whole script reads as one flat
// peak (chain-of-custody, counter-offer, transfer-window, two-lane join
// quiet-season, room-12 and same-page). That is the honest reading — those
// drafts carry no PERIL vocabulary at all, only a camera shot, a creek that
// runs, and a dark hallway — and it is the same shape as the boneyard
// correction above rather than a new class of error.
//
// THE AGGREGATE HONESTY ASSERTIONS DID NOT MOVE, again: d1Disagreement is
// still exactly 1 (mise) and d2Disagreement still exactly 3 (quiet-season,
// the-detour, undertow). The detector's selectivity claim has now survived
// two independent corrections to the signal underneath it, which is the
// useful thing to know about it.
const LOCKED_CORPUS_TABLE: CorpusRow[] = [
  { file: 'chain-of-custody.fountain', protagonist: 'NELL', sceneCount: 13, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'close-quarters.fountain', protagonist: 'ROSALIND', sceneCount: 13, peakSceneIdxs: [5], anyAgencyAtPeak: false, allSpectatorAtPeak: true, act3InitiativeCount: 0, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'code-blue.fountain', protagonist: 'RIVA', sceneCount: 14, peakSceneIdxs: [5], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'counter-offer.fountain', protagonist: 'WREN', sceneCount: 10, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'dead-frequency.fountain', protagonist: 'MAYA', sceneCount: 12, peakSceneIdxs: [4], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 3, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'high-voltage.fountain', protagonist: 'JUNE', sceneCount: 13, peakSceneIdxs: [0, 2, 9], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'mise.fountain', protagonist: 'LUCIA', sceneCount: 12, peakSceneIdxs: [4], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: true, d2Disagreement: false },
  { file: 'off-season.fountain', protagonist: 'GRETA', sceneCount: 9, peakSceneIdxs: [7], anyAgencyAtPeak: false, allSpectatorAtPeak: true, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'quiet-season.fountain', protagonist: 'MARJORIE', sceneCount: 10, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: true },
  { file: 'red-line.fountain', protagonist: 'MARCUS', sceneCount: 14, peakSceneIdxs: [3, 5, 10], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'room-12.fountain', protagonist: 'NORA', sceneCount: 10, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'runoff.fountain', protagonist: 'SARA', sceneCount: 9, peakSceneIdxs: [8], anyAgencyAtPeak: false, allSpectatorAtPeak: true, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'same-page.fountain', protagonist: 'ALEX', sceneCount: 11, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'soft-launch.fountain', protagonist: 'NADIA', sceneCount: 12, peakSceneIdxs: [0], anyAgencyAtPeak: false, allSpectatorAtPeak: true, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'the-defense-rests.fountain', protagonist: 'DESI', sceneCount: 12, peakSceneIdxs: [1, 3, 4, 5, 6, 7, 9, 10, 11], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'the-detour.fountain', protagonist: 'MAYA', sceneCount: 11, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 8, 9], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: true },
  { file: 'the-key-under-the-mat.fountain', protagonist: 'NORA', sceneCount: 11, peakSceneIdxs: [2], anyAgencyAtPeak: false, allSpectatorAtPeak: true, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'transfer-window.fountain', protagonist: 'DEV', sceneCount: 10, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 7, 8, 9], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: false },
  { file: 'two-lane.fountain', protagonist: 'CORA', sceneCount: 13, peakSceneIdxs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], anyAgencyAtPeak: true, allSpectatorAtPeak: false, act3InitiativeCount: 0, act3SceneCount: 4, d1Disagreement: false, d2Disagreement: false },
  { file: 'undertow.fountain', protagonist: 'KAT', sceneCount: 12, peakSceneIdxs: [5], anyAgencyAtPeak: false, allSpectatorAtPeak: false, act3InitiativeCount: 1, act3SceneCount: 3, d1Disagreement: false, d2Disagreement: true },
];

describe('agency-signal — measured evidence table over the 20 tracked CC0 scripts (data/screenplays/*.fountain)', () => {
  const cc0Set = new Set(LOCKED_CORPUS_TABLE.map(r => r.file));
  const files = fs.readdirSync(corpusDir).filter(f => cc0Set.has(f)).sort();

  it('the corpus directory still holds exactly the 20 locked files this table measured', () => {
    assert.deepEqual(files, LOCKED_CORPUS_TABLE.map(r => r.file));
  });

  for (const row of LOCKED_CORPUS_TABLE) {
    it(`${row.file}: matches the locked, measured agency-signal read (protagonist=${row.protagonist})`, () => {
      const text = fs.readFileSync(path.join(corpusDir, row.file), 'utf8');
      const { records, characters } = analyzeFountainText(text);
      assert.equal(records.length, row.sceneCount, 'scene count drifted — the corpus file changed, re-measure the whole table');
      assert.equal(characters[0], row.protagonist, 'most-frequent-speaker protagonist inference drifted — re-measure');

      const peak = detectPeakAgency(records, row.protagonist);
      assert.deepEqual(peak.peakSceneIdxs, row.peakSceneIdxs);
      assert.equal(peak.anyAgencyAtPeak, row.anyAgencyAtPeak);
      assert.equal(peak.allSpectatorAtPeak, row.allSpectatorAtPeak);

      const act3 = detectAct3Agency(records, row.protagonist);
      assert.equal(act3.initiativeCount, row.act3InitiativeCount);
      assert.equal(act3.sceneCount, row.act3SceneCount);

      const d1 = computeD1AgencyDelta(records, row.protagonist);
      assert.equal(d1.disagreement, row.d1Disagreement);
      const d2 = computeD2AgencyDelta(records, row.protagonist);
      assert.equal(d2.disagreement, row.d2Disagreement);
    });
  }

  it('fires selectively across the corpus — neither dead (never fires) nor over-firing (always fires) on either honesty axis', () => {
    const anyAgencyCount = LOCKED_CORPUS_TABLE.filter(r => r.anyAgencyAtPeak).length;
    const allSpectatorCount = LOCKED_CORPUS_TABLE.filter(r => r.allSpectatorAtPeak).length;
    const d1DisagreeCount = LOCKED_CORPUS_TABLE.filter(r => r.d1Disagreement).length;
    const d2DisagreeCount = LOCKED_CORPUS_TABLE.filter(r => r.d2Disagreement).length;
    const n = LOCKED_CORPUS_TABLE.length;

    assert.ok(anyAgencyCount > 0 && anyAgencyCount < n, `anyAgencyAtPeak fired on ${anyAgencyCount}/${n} scripts — expected selective, not 0 or all`);
    assert.ok(allSpectatorCount > 0 && allSpectatorCount < n, `allSpectatorAtPeak fired on ${allSpectatorCount}/${n} scripts — expected selective, not 0 or all`);
    // D1/D2 disagreement is the rarer, higher-bar event (legacy predicate
    // must ALSO match the passivity shape, on top of this module finding
    // agency) — measured at 1/20 and 3/20 respectively. Assert bounds, not
    // exact re-derivation of the count here, so the per-file test loop
    // above (which DOES pin exact values) remains the single source of
    // truth for any single script's read.
    assert.equal(d1DisagreeCount, 1, 'measured 2026-08-04, re-measured 2026-09-04 (boneyard + danger-lexicon corrections): mise.fountain only, unmoved by either');
    assert.equal(d2DisagreeCount, 3, 'measured 2026-08-04, re-measured 2026-09-04 (boneyard + danger-lexicon corrections): quiet-season.fountain, the-detour.fountain, undertow.fountain, unmoved by either');
  });
});
