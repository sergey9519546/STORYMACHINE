// DENSITY-BIAS GUARDS (Lane H, 2026-08-04) — the composite-reviewer blind spot.
//
// ── What this file protects ────────────────────────────────────────────────
// tests/core/discrimination.test.ts carried one remaining `todo`: the
// composite-reviewer pair (a reviewer's real finding reconstructed — an
// overall well-crafted script vs an overall poorly-crafted one at matched
// size) showed a health gap of only +2.2 against a 5.0-point floor. The
// diagnosis was never a threshold problem: ~20 MINOR rhythm/dialogue-shape
// rules were firing on the GOOD half's denser, more dramatized prose. Good
// writing was being taxed for being written richly — the same
// false-positive-density family as the D1/D2 and D4 defects, where a rule
// reads a proxy (line length, run length, dialogue ratio) that correlates
// with prose DENSITY rather than with weakness.
//
// Six rules were guarded. Every guard is justified by a measurement against
// TWO independent ground truths — the calibration corpus's band labels and
// the discrimination pairs' good/bad sides — never by "this makes the pair
// pass". The full measured offender table, the per-rule recall cost, and the
// 53-script blast radius are recorded in
// docs/p1-benchmark/MEASUREMENT_RECEIPTS.md (2026-08-04, Lane H).
//
// ── Why each guarded rule needs BOTH kinds of fixture ──────────────────────
// A guard that only silences a rule is indistinguishable from deleting it,
// and the deletion moratorium forbids that. So every guarded rule gets a
// NEGATIVE fixture (the false positive it must no longer produce) AND a
// POSITIVE fixture (genuinely weak writing it must still catch). If a future
// change over-widens a guard, the positive fixture fails; if a future change
// reverts a guard, the negative fixture fails.
//
// ── Falsifiability ────────────────────────────────────────────────────────
// Each guard was individually reverted in place and this file re-run to
// confirm that exactly its own negative fixture fails and nothing else does.
// Result recorded in the receipts entry.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rhythmPass } from '../../server/nvm/revision/passes/rhythm.ts';
import { dialoguePass } from '../../server/nvm/revision/passes/dialogue.ts';
import { originalityPass } from '../../server/nvm/revision/passes/originality.ts';

const rec = (idx: number): any => ({
  commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
  purpose: 'complicate', dramaticTurn: 'nothing', revelation: null,
  clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
  curiosityDelta: 0, dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
  payoffSetupIds: [], visualBeats: [], relationshipShifts: [], createdAt: 0,
});
const recs = (n: number) => Array.from({ length: n }, (_, i) => rec(i));

async function rhythmRules(fountain: string, n = 8): Promise<string[]> {
  const r = await rhythmPass({
    fountain, original: fountain, records: recs(n) as any,
    structure: {} as any, annotations: [], approvedSpans: [],
  });
  return r.issues.map(i => i.rule);
}
async function dialogueRules(fountain: string, n = 8): Promise<string[]> {
  const r = await dialoguePass({
    fountain, original: fountain, records: recs(n) as any,
    structure: {} as any, annotations: [], approvedSpans: [],
  });
  return r.issues.map(i => i.rule);
}
// NOTE: originalityPass caps its returned issues at 8 (`prioritized.slice(0, 8)`
// in that file). A large `records` array makes scene-level rules crowd the
// dialogue-shape rule under test out of the cap and produce a FALSE PASS on a
// negative fixture, so these tests deliberately use a minimal record set.
async function originalityRules(fountain: string, n = 2): Promise<string[]> {
  const r = await originalityPass({
    fountain, original: fountain, records: recs(n) as any,
    structure: {} as any, annotations: [], approvedSpans: [],
  });
  return r.issues.map(i => i.rule);
}

// ── G1: rhythm/ACTION_CONSECUTIVE_LONG_RUN — per-line bar 9w → 15w ─────────
// MEASURED DEFECT: at the 9-word bar this fired on 10/10 of the calibration
// corpus's KNOWN-STRONG band vs 7/10 of the known-weak band, and on 18/20
// (90%) of the CC0 reference screenplays. 9 words sits below the 25th
// percentile of action-line length in every corpus measured (CC0 p25=13,
// median=19, mean=20.0), so it was detecting the presence of ordinary
// screenplay prose, not a "dense-prose avalanche".
describe('G1 ACTION_CONSECUTIVE_LONG_RUN — bar re-anchored to the measured corpus', () => {
  // NEGATIVE: ordinary-length action lines (9–14 words) must no longer fire.
  // This is exactly the band that constitutes the reference corpus's own
  // interquartile range.
  it('does NOT fire on a run of ordinary-length action lines (9-14 words each)', async () => {
    // 9 action lines, every one 9-14 words, all consecutive: clears the rule's
    // n>=8 gate and WOULD fire at the old 9-word bar (falsifiability-verified),
    // so this fixture genuinely isolates the re-anchored threshold.
    const fountain = `INT. KITCHEN - DAY

Maya sets the kettle down and turns toward the window slowly.

She wipes her hands on the towel hanging by the sink.

The radio in the corner plays something she does not recognise.

Outside, a car door closes and footsteps cross the gravel.

She reaches over and turns the radio volume down.

Her brother appears in the doorway holding a folded envelope.

He sets the envelope on the table between them carefully.

She looks at it without reaching for it at all.

The kettle begins to whistle on the stove behind her.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      !rules.includes('ACTION_CONSECUTIVE_LONG_RUN'),
      'ordinary 9-14 word action lines are the reference corpus\'s own interquartile range — '
      + `they must not read as a dense-prose avalanche. Fired: ${JSON.stringify(rules)}`,
    );
  });

  // POSITIVE: a genuine wall of text (5+ consecutive lines well over 15 words)
  // must still fire. This is the true positive the guard preserves.
  it('STILL fires on a genuine wall of text (5+ consecutive lines of 15+ words)', async () => {
    const fountain = `INT. WAREHOUSE - NIGHT

Maya moves through the narrow aisle between the stacked crates, her flashlight sweeping across the damp concrete floor ahead of her.

The overhead pipes drip steadily onto the tarpaulin below, and somewhere far behind her a heavy door swings shut on its hinges.

She stops beside a pallet wrapped in plastic sheeting and shines the beam down along the seam where the wrapping has been cut open.

Inside the plastic there are cardboard cartons stamped with a shipping code she recognises from the manifest she photographed that morning.

She pulls her phone from her jacket pocket and photographs the code twice, once with the flash and once without it.

Behind her the heavy door opens again and a rectangle of yellow light spreads slowly across the concrete toward her feet.

She lowers the flashlight against her leg and holds still where she stands between the two stacks of crates.

The footsteps come down the aisle at an unhurried pace and stop somewhere on the far side of the pallet.

A second beam of light travels along the plastic sheeting above her head and settles on the cut seam.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      rules.includes('ACTION_CONSECUTIVE_LONG_RUN'),
      `a genuine run of 15+ word lines must still be caught. Fired: ${JSON.stringify(rules)}`,
    );
  });
});

// ── G2: rhythm/LONG_LINE_FLOOD — "long" bar 12w → 20w ─────────────────────
// MEASURED DEFECT: 81% of ALL action lines in the 20 CC0 reference
// screenplays are already >=12 words, so ">60% of lines >=12w" was satisfied
// by 18/20 (90%) of that corpus — the rule reported the normal condition of
// screenplay action prose as a flaw, and was inverted on calibration (3/10
// strong band vs 0/10 weak band).
describe('G2 LONG_LINE_FLOOD — "long" re-anchored to the corpus median action line', () => {
  // NEGATIVE: lines clustered in the 12-19 word band (the CC0 interquartile
  // range) must no longer read as a wall of text.
  it('does NOT fire on prose clustered in the corpus\'s own 12-19 word band', async () => {
    // 10 action lines, every one 12-14 words — squarely inside the CC0
    // interquartile range. 100% clear the OLD 12-word bar (so this fires when
    // the guard is reverted, falsifiability-verified) and 0% clear the new
    // 20-word bar.
    const fountain = `INT. OFFICE - DAY

Ravi drops the folder on the desk and pulls the chair out opposite her.

He waits for her to look up from the screen before he speaks.

She finishes the sentence she is typing and only then turns to face him.

The blinds behind her are half open and the light falls in stripes.

He turns the folder around so that it faces her across the desk.

She reads the top sheet without touching it or changing her expression.

Her hand moves to the mouse and she closes the window on the screen.

He watches her decide how much of this she is going to admit.

She pushes the folder back across the desk toward him without a word.

Neither of them says anything for long enough that it becomes uncomfortable.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      !rules.includes('LONG_LINE_FLOOD'),
      '12-19 word action lines are the reference corpus\'s interquartile range and must not be '
      + `reported as uniformly dense. Fired: ${JSON.stringify(rules)}`,
    );
  });

  // POSITIVE: a majority of genuinely long (>=20 word) lines must still fire.
  it('STILL fires when a majority of action lines exceed the corpus median (20+ words)', async () => {
    const fountain = `INT. OFFICE - DAY

Ravi drops the heavy folder onto the desk between them and pulls the chair out with his foot before sitting down.

He waits for her to look up from the screen, and when she does not, he waits a while longer without saying anything.

She finishes the sentence she is typing, saves the document, and only then turns the monitor slightly away from him.

The blinds behind her desk are half open and the afternoon light falls across the paperwork in long uneven stripes.

He turns the folder around so that it faces her directly and pushes it the last few inches toward her hands.

She reads the top sheet without touching it, her eyes moving down the page slowly and then back up to the header.

Her hand moves to the mouse and she closes the window on the screen without looking at what she is closing.

He watches her decide, in real time, exactly how much of this she is going to admit she already knew about.

She pushes the folder back across the desk toward him without adding anything at all to what is written in it.

Neither of them says anything for long enough that the sound of the corridor outside becomes noticeable through the door.

He picks the folder up, squares its edges against the desktop, and holds it against his chest as he stands.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      rules.includes('LONG_LINE_FLOOD'),
      `genuinely dense prose (majority of lines 20+ words) must still fire. Fired: ${JSON.stringify(rules)}`,
    );
  });
});

// ── G3: rhythm/ACTION_LONG_BEAT_UNCAUSED — placement needs opportunity ─────
// MEASURED DEFECT: P(fire | script has NO <=4w action line) = 36/36 = 1.00;
// P(fire | script HAS a <=4w action line) = 1/13 = 0.08. 36 of 37 fires were
// a mechanical restatement of "this script has no short action lines" — which
// voice.ts's SENTENCE_FRAGMENT_STARVATION already reports at the identical
// <=4-word bar. One property, charged twice across two passes.
describe('G3 ACTION_LONG_BEAT_UNCAUSED — a placement finding needs the register to exist', () => {
  // NEGATIVE: no short line anywhere => the adjacency is arithmetically
  // impossible, so this must not be reported as a separate placement failure.
  it('does NOT fire when the script has no short-line register at all (absence is reported elsewhere)', async () => {
    const fountain = `INT. HOSPITAL CORRIDOR - NIGHT

Dana walks the length of the corridor reading the chart she has been handed.

The duty nurse follows a step behind her explaining the overnight observations.

They stop together outside the door of the room at the far end of the hall.

Dana hands the chart back and pushes the door open with her shoulder.

The patient inside is awake and watching the doorway with no particular expression.

Dana crosses to the bed and checks the monitor readings against the chart figures.

She adjusts the drip rate by a small amount and notes the change on the sheet.

The nurse writes the same figure onto the clipboard hanging at the foot of the bed.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      !rules.includes('ACTION_LONG_BEAT_UNCAUSED'),
      'with zero <=4w lines the adjacency cannot exist, so this is a duplicate of the absence '
      + `finding, not a placement failure. Fired: ${JSON.stringify(rules)}`,
    );
  });

  // POSITIVE: short lines DO exist but are never placed before a long one —
  // the genuine placement failure the rule claims to detect.
  it('STILL fires on the genuine placement failure (short lines exist, never before a long one)', async () => {
    const fountain = `INT. HOSPITAL CORRIDOR - NIGHT

Dana walks the length of the corridor reading the chart she has been handed.

The duty nurse follows a step behind her explaining the overnight observations.

They stop together outside the door of the room at the far end of the hall.

Dana hands the chart back and pushes the door open with her shoulder slowly.

The patient inside is awake and watching the doorway with no particular expression.

Dana crosses to the bed and checks the monitor readings against the chart figures.

She adjusts the drip rate by a small amount and notes the change on the sheet.

The nurse writes the same figure onto the clipboard at the foot of the bed.

She stops.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      rules.includes('ACTION_LONG_BEAT_UNCAUSED'),
      'short lines exist but never precede a long one — the genuine placement failure must still '
      + `be caught. Fired: ${JSON.stringify(rules)}`,
    );
  });
});

// ── G4: rhythm/ACTION_LONG_RECOVERY_ABSENT — same defect, aftermath side ───
// MEASURED DEFECT: P(fire | no <=7w action line) = 13/28 = 0.46;
// P(fire | has a <=7w action line) = 1/21 = 0.05. Only 1 of 14 fires was an
// informative placement failure.
describe('G4 ACTION_LONG_RECOVERY_ABSENT — the recovery register must exist to be mis-placed', () => {
  it('does NOT fire when no recovery-length line exists anywhere in the script', async () => {
    // 9 action lines, none <=7 words, five of them >=14 words outside the final
    // two — clears the rule's n>=8 and qualifying>=2 gates, so it WOULD fire
    // with the precondition reverted (falsifiability-verified).
    const fountain = `EXT. QUARRY ROAD - NIGHT

Addie follows the tire tracks along the shoulder with her flashlight held low.

The tracks turn off the gravel and run toward the locked gate at the treeline.

She cuts the padlock with the bolt cutters she carried up from the trunk.

The chain falls into the mud and she pushes the gate inward with both hands.

Beyond the gate the road drops away steeply toward the flooded lower workings.

She works her way down the slope with one hand against the rock face.

At the bottom the water has risen over the rails of the old service track.

She stands at the waterline and plays the light across the flooded opening.

Nothing moves on the surface except the reflection of her own beam.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      !rules.includes('ACTION_LONG_RECOVERY_ABSENT'),
      'with zero <=7w lines the "density peak -> recovery beat" pattern cannot exist, so this is '
      + `a duplicate of the absence finding. Fired: ${JSON.stringify(rules)}`,
    );
  });

  it('STILL fires when recovery beats exist but never follow a density peak', async () => {
    const fountain = `EXT. QUARRY ROAD - NIGHT

She waits.

Addie follows the tire tracks along the shoulder with her flashlight held low.

The tracks turn off the gravel and run toward the locked gate at the treeline.

She cuts the padlock with the bolt cutters she carried up from the trunk.

The chain falls into the mud and she pushes the gate inward with both hands.

Beyond the gate the road drops away steeply toward the flooded lower workings.

She works her way down the slope with one hand against the rock face.

At the bottom the water has risen over the rails of the old service track.
`;
    const rules = await rhythmRules(fountain);
    assert.ok(
      rules.includes('ACTION_LONG_RECOVERY_ABSENT'),
      'a recovery beat exists but never lands after a long line — the genuine placement failure '
      + `must still be caught. Fired: ${JSON.stringify(rules)}`,
    );
  });
});

// ── G5: dialogue/TALKING_HEADS — cue count → talk volume ──────────────────
// MEASURED DEFECT: the trigger counted character CUES, a proxy for how finely
// the dialogue is CUT rather than how much talk there is. Terse, clipped,
// subtextual exchanges accumulate cues FASTER than verbose ones, so the rule
// fired earlier on better-written dialogue. Across the 20 CC0 reference
// screenplays every genuine qualifying run carries 88-174 words; across the
// 12 discrimination-pair halves every qualifying run carries 20-61 words.
// The 80-word bar sits in the empty gap between those two populations.
describe('G5 TALKING_HEADS — a run must carry real talk, not just many cues', () => {
  // NEGATIVE: a terse, clipped 5-cue volley bracketed by staged action.
  // Modelled on the composite-reviewer fixture's own mother/daughter beat.
  it('does NOT fire on a terse 5-exchange volley bracketed by staged physical action', async () => {
    const fountain = `INT. MORROW HOUSE - KITCHEN - NIGHT

Addie's mother sets down a mug Addie doesn't touch, wipes her hands on her apron.

MOTHER
You don't have to be the one who finds her.

ADDIE
Somebody has to be.

MOTHER
It doesn't have to be you every time.

ADDIE
It does this time.

MOTHER
You always say that.

Addie is already reaching for her jacket, keys in hand before her mother finishes.
`;
    const rules = await dialogueRules(fountain, 2);
    assert.ok(
      !rules.includes('TALKING_HEADS'),
      'a 5-cue run carrying ~30 words, bracketed by staged action on both sides, is a tense clipped '
      + `exchange — the physical world has not disappeared. Fired: ${JSON.stringify(rules)}`,
    );
  });

  // POSITIVE: a genuinely disembodied run — 5+ exchanges carrying real volume.
  it('STILL fires on a genuinely disembodied run (5+ exchanges carrying 80+ words)', async () => {
    const fountain = `INT. CONFERENCE ROOM - DAY

The committee assembles around the long table with their folders open.

CHAIR
I want to begin by saying that the review board has considered every submission we received this quarter and has weighed them carefully against the published criteria.

DELEGATE
That is precisely the concern I raised in writing before this meeting was convened, because the published criteria were themselves revised only after the submission window had already closed.

CHAIR
The revision was procedural and was circulated to every member of this committee in advance, along with an explanatory note setting out the reasoning behind each individual amendment.

DELEGATE
Circulated is not the same as agreed, and I would like the minutes to record that I did not agree to any of it at the time or subsequently.

CHAIR
The minutes will record whatever you would like them to record, but the decision itself stands and the applicants have already been notified of the outcome in writing.

DELEGATE
Then I would like the minutes to record that as well, along with my objection to the sequence in which those two things happened.
`;
    const rules = await dialogueRules(fountain, 2);
    assert.ok(
      rules.includes('TALKING_HEADS'),
      `a high-volume disembodied run must still be caught. Fired: ${JSON.stringify(rules)}`,
    );
  });
});

// ── G6: originality/DIALOGUE_MONOLOGUE_DROUGHT — audit the right channel ───
// MEASURED DEFECT: the rule audits the dialogue channel for a missing upper
// tail with no gate on whether the script's drama actually sits in that
// channel, so it fired hardest on scripts that tell their story in IMAGES.
// Inverted on both ground truths: calibration known-strong 10/10 vs
// known-weak 6/10; pair GOOD halves 3/6 vs BAD halves 2/6.
describe('G6 DIALOGUE_MONOLOGUE_DROUGHT — only diagnose a script whose drama is carried by speech', () => {
  // NEGATIVE: an action-driven script with deliberately terse dialogue.
  it('does NOT fire on an action-driven script with deliberately clipped dialogue', async () => {
    // 20 action lines against 12 dialogue lines: the drama is carried by images,
    // so the dialogue-driven gate (dlg >= 1.5 x action) correctly exempts it.
    // Dialogue is still >= 12 lines, so the rule's ORIGINAL trigger is otherwise
    // satisfied — this fixture isolates the new gate as the only thing stopping it.
    const action = Array.from({ length: 20 }, (_, i) =>
      `Addie crosses the yard and checks the lock on shed door number ${i} carefully.`).join('\n\n');
    const talk = Array.from({ length: 6 }, () => `ADDIE\nNot yet.\n\nDEPUTY\nOkay.`).join('\n\n');
    const fountain = `INT. YARD - DAY\n\n${action}\n\n${talk}\n`;
    const rules = await originalityRules(fountain);
    assert.ok(
      !rules.includes('DIALOGUE_MONOLOGUE_DROUGHT'),
      '"no character ever holds the floor" is only a diagnosis about a script whose drama is carried '
      + `by speech; this one is carried by images. Fired: ${JSON.stringify(rules)}`,
    );
  });

  // POSITIVE: a dialogue-driven script whose register really is telegraphic.
  it('STILL fires on a dialogue-driven script with a uniformly telegraphic register', async () => {
    const talk = Array.from({ length: 14 }, () => `ADDIE\nNot yet.\n\nDEPUTY\nOkay then.`).join('\n\n');
    const fountain = `INT. OFFICE - DAY\n\nShe waits.\n\n${talk}\n`;
    const rules = await originalityRules(fountain);
    assert.ok(
      rules.includes('DIALOGUE_MONOLOGUE_DROUGHT'),
      'a genuinely dialogue-driven script where nobody ever sustains a thought must still fire. '
      + `Fired: ${JSON.stringify(rules)}`,
    );
  });
});
