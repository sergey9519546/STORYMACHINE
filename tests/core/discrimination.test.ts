// DISCRIMINATION HARNESS (Run 18-γ) — a permanent CI guarantee that
// well-crafted writing outscores poorly-crafted writing.
//
// ── Why this file exists ──────────────────────────────────────────────────
// An adversarial reviewer submitted a deliberately flat, on-the-nose,
// passive-protagonist script that scored 78.7, then a genuinely
// well-crafted subtextual scene (real stakes, active protagonist,
// elliptical dialogue, ironic ending) that scored 72 — LOWER. The health
// score inverted on exactly the writing it exists to reward, and nothing in
// CI caught it. This file runs runScriptDoctor over
// calibration/discrimination-pairs.ts's 6 paired samples (good craft vs bad
// craft, same premise, matched length) and asserts good.health > bad.health.
//
// ── Why these assertions are RELATIVE, never absolute ─────────────────────
// doctor.ts, fountain-analyzer.ts, and the revision passes are under active
// concurrent development by other agents in this run. An absolute score pin
// ("good scores at least 74") would break on the next unrelated formula
// tweak; a relative comparison (good > bad, same premise, same size) is the
// only assertion shape that survives formula evolution while still catching
// a real discrimination regression.
//
// ── Honest ledger: measured against the CURRENT formula ───────────────────
// UPDATED by the health-formula sensitivity wave (W1): three pairs
// (subtext, active-protagonist, dramatized-exposition) were previously
// EXACTLY TIED at displayed health 79.8 — doctor.ts's craftPenalty density
// term (density^3.75) was tuned entirely against the reference corpus's
// density >= 1.4 regime, and crushed the sub-1.0 densities these 7-scene,
// ~400-470-word pairs land at to <0.05-point differences. doctor.ts's
// densityPenalty now carries a second, independently-tuned curve for
// density < 1.0 (see that function's own comment for the full measurement
// and the curve chosen) — the corpus's own density >= 1.4 regime, and every
// existing calibration/length-invariance guarantee, is untouched (that
// branch of densityPenalty is byte-identical code).
//
// Current measured state (P6: all 6 axes now discriminate on plain ordering;
// only the stricter composite minimum-gap guard remains a todo):
//
//   escalation-vs-flat-repetition:    good 76.1 > bad 70.0  (gap +6.1) PASS
//   setup-payoff-vs-orphaned-setups:  good 74.6 > bad 70.0  (gap +4.6) PASS
//   subtext-vs-on-the-nose:           good 79.1 > bad 77.7  (gap +1.4) PASS (flipped by W1)
//   dramatized-vs-told-exposition:    good 74.0 > bad 72.6  (gap +1.4) PASS (flipped by W1)
//   composite-reviewer-scenario:      good 72.2 > bad 70.0  (gap +2.2) PASS ordering; 5.0-pt min-gap still FAILS
//   active-vs-passive-protagonist:    good 76.6 > bad 70.4  (gap +6.2, measured post-merge — the two
//                                     parallel fixes COMPOUND: P6's climax fix lifts the good half while
//                                     both rule families fire on the passive half)
//                                     — closed INDEPENDENTLY by two parallel sessions
//                                     whose work is merged here: Wave 1193 (three protagonist-agency
//                                     detectors: PROTAGONIST_DEFERENCE_RUN / AGENCY_PROXY /
//                                     PROTAGONIST_ACTED_UPON_FINALE) and P6 (PROTAGONIST_DECISION_VACUUM +
//                                     the INTENTION_REACTIVE_CLIMAX payoff fix). The rule families overlap
//                                     by design lineage but carry distinct gates (30% vs 40% plurality,
//                                     split vs combined lexicons, finale action-line receipts) — co-firing
//                                     on strongly passive scripts is correct behavior, and the W3
//                                     duplicate-family merge layer already dedupes them for display.
//
// active-vs-passive-protagonist flipped by closing BOTH diagnosed causes,
// principled fix in each case (P6, discrimination-harness hardening — see
// server/nvm/revision/passes/intention.ts for both changes):
//   (1) residual false positive: INTENTION_REACTIVE_CLIMAX's climax-zone
//       "proactive" check only recognized NEW initiative (a clock raised or
//       a clue planted), so a protagonist whose climax scene delivers/pays
//       off an earlier-seeded clue — precisely what an active protagonist's
//       climax usually looks like — read as passive. Scoped fix: the
//       climax-zone check (only) now also counts a payoff landing in the
//       zone as decisive follow-through; the shared isProactive258 helper
//       used by every OTHER proactive-timing rule in the file is untouched.
//       This alone removed 0.5 weighted points from the active half.
//   (2) missing true positive: no existing signal distinguished a
//       protagonist who drives decisions from one to whom decisions happen —
//       every driver field in ScreenplaySceneRecord (clockRaised,
//       seededClueIds, payoffSetupIds, relationshipShifts, suspenseDelta) is
//       scene-level, not attributed to a specific character, so a coworker
//       making every call for the nominal lead was invisible to the rule
//       set. New detector PROTAGONIST_DECISION_VACUUM reads dialogue
//       directly off the raw fountain text (same ALL-CAPS-cue scan every
//       DIALOGUE_* rule already uses): a clear top speaker (>=40% of lines)
//       whose own dialogue is pure deferral ("okay", "whatever you think is
//       best") with zero first-person commitment language, while another
//       character's dialogue explicitly decides and acts on their behalf
//       ("let me handle it", "you don't need to worry about that"), is a
//       protagonist in name only. Fires on the passive half (+1.5 weighted
//       points there), does not fire on the active half (Dana's own lines —
//       "I'll testify to all of it", "I already made copies" — clear the
//       zero-commitment guard).
// The remaining residual false positives on the active half diagnosed
// pre-wave (ACTION_WITHOUT_CONSEQUENCE, GOAL_WITHOUT_OPPOSITION — both
// causality.ts) were re-measured and left AS-IS on principle: both are
// signal-desert artifacts (the confrontation scenes they miss register zero
// relationshipShift/suspenseDelta reversal anywhere in the fixture, a
// fountain-analyzer.ts detection gap out of this wave's file ownership, not
// a causality.ts guard bug) — see the D2-a comments at each rule for the
// full prior diagnosis, unchanged. The rhythm.ts density-family fires
// (RUN_ON_ACTION, SET_DRESSING_DOMINANCE, TRIADIC_LIST_OVERLOAD,
// ACTION_CONSECUTIVE_LONG_RUN, ACTION_DENSITY_PEAK_EARLY,
// ACTION_COMMA_DENSE_FLOOD) were audited and left as honest fires: the
// active-protagonist fixture's prose is genuinely denser (more physical
// staging, more texture) than the passive fixture's mostly-dialogue scenes —
// that is a real property of the text, not a rule defect, and weakening
// density rules to flatter one fixture's prose style would be tuning the
// judge, not fixing a bug.
//
// All 6 pairs' plain good > bad ORDERING are now hard (non-todo) assertions —
// a regression on any of them must fail CI immediately. Only the separate,
// stricter composite minimum-gap guard (COMPOSITE_MIN_GAP=5.0, below) stays
// `todo`: composite's ordering passes but its margin (+2.2) doesn't clear
// that floor yet. That remaining todo is a standing invitation to flip to a
// hard assertion the moment a Wave Program v2 detector (excellence detectors
// and root-cause templates are the most directly relevant wave types) closes
// the gap. Do NOT delete a todo without first re-running this file and
// confirming the gap actually closed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { DISCRIMINATION_PAIRS } from '../../server/nvm/analyze/calibration/discrimination-pairs.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

/** Pair ids the CURRENT formula already discriminates correctly (measured
 *  above). Everything else gets a `todo` so a real regression on these four
 *  fails CI today, while the known blind spots don't turn the suite red for
 *  a limitation this file exists to document, not silently paper over. */
const KNOWN_DISCRIMINATING = new Set<string>([
  'escalation-vs-flat-repetition',
  'setup-payoff-vs-orphaned-setups',
  // Flipped by the health-formula sensitivity wave (W1): doctor.ts's
  // densityPenalty sub-1.0-density curve gives these pairs' small weighted-
  // issue-count deltas (subtext: 33 vs 36; dramatized: 35 vs 38.5) real
  // separation instead of crushing them to <0.05 points — see the ledger
  // above and densityPenalty's own comment for the measurement.
  'subtext-vs-on-the-nose',
  'dramatized-vs-told-exposition',
  // Flipped by Wave 1193 (protagonist-agency detectors: PROTAGONIST_
  // DEFERENCE_RUN, AGENCY_PROXY, PROTAGONIST_ACTED_UPON_FINALE in
  // intention.ts): the passive half now fires the three passivity rules the
  // blind-spot note said were missing (measured good 75.8 > bad 71.2,
  // gap +4.6); all three are corpus-silent (0/20) and fire on no other
  // pair's either half — precision verified before this flip.
  'active-vs-passive-protagonist',
  // Also flipped: the plain good > bad ORDERING now genuinely holds for the
  // composite pair too (+2.2, up from a dead tie) — but the separate
  // minimum-gap regression guard below (COMPOSITE_MIN_GAP=5.0) still does
  // not clear, so that second, stricter assertion stays `todo`.
  'composite-reviewer-scenario',
  // Flipped by P6 (discrimination-harness hardening): INTENTION_REACTIVE_
  // CLIMAX's climax-zone false positive fixed + new PROTAGONIST_DECISION_
  // VACUUM true-positive detector added to intention.ts — see the ledger
  // above for the full before/after and the two rules' own comments for the
  // measurement each fix is based on. Gap moved from -1.9 to +1.3.
  'active-vs-passive-protagonist',
]);

/** Per-pair blind-spot note surfaced in the todo reason and, on a rare
 *  local non-todo run where the assertion fails anyway, the developer sees
 *  it inline via the message argument below rather than having to go dig up
 *  this comment block. */
const BLIND_SPOT_NOTE: Record<string, string> = {
  'active-vs-passive-protagonist':
    'CLOSED twice in parallel (Wave 1193 dialogue-attribution agency detectors + P6 DECISION_VACUUM/'
    + 'REACTIVE_CLIMAX fix, merged) — retained so a regression here surfaces the history: pre-fix no signal '
    + 'distinguished a protagonist who drives decisions from one things merely happen to',
  'composite-reviewer-scenario':
    "reproduces the reviewer's original finding directly: an overall well-crafted script and an overall "
    + 'poorly-crafted one of matched size scores only a modest gap (+2.2 as of the W1 health-formula wave, up '
    + 'from a dead tie) — real but short of the 5.0-point floor below. DIAGNOSED 2026-07-10 (rule-level diff): '
    + 'the bad half already fires 22 rules the good half does not (EXPOSITION_DUMP x2, NO_RELATIONSHIP_MOVEMENT, '
    + 'dialogue floods) — the residual gap is ~19 STYLE-MINOR false positives on the GOOD half (rhythm/dialogue '
    + 'line-shape rules: LONG_LINE_FLOOD, ACTION_CONSECUTIVE_LONG_RUN, DIALOGUE_ANAPHORA_RUN, etc.) tripping on '
    + 'dramatized action prose, the same D2 pattern spread thin across many rules. Closing it honestly is a '
    + 'dedicated guard wave over those rhythm minors (each measured against calibration), not a lexicon chase '
    + 'on this fixture',
};

function topIssues(report: ScriptDoctorReport, n = 3): string {
  if (report.topPriorities.length === 0) return '(none)';
  return report.topPriorities
    .slice(0, n)
    .map(i => `${i.pass}/${i.rule} [${i.severity}]: ${i.description}`)
    .join(' | ');
}

/** Rich failure-message builder: both scores, the gap, and each side's top
 *  priority issues, so a future regression is debuggable from the test
 *  output alone — no need to re-run the harness by hand to see why. */
function diagnosticMessage(
  pairId: string,
  description: string,
  goodLabel: string,
  badLabel: string,
  good: ScriptDoctorReport,
  bad: ScriptDoctorReport,
): string {
  return [
    `pair="${pairId}": ${description}`,
    `  good "${goodLabel}": health=${good.health} (top issues: ${topIssues(good)})`,
    `  bad  "${badLabel}": health=${bad.health} (top issues: ${topIssues(bad)})`,
    `  gap (good - bad) = ${(good.health - bad.health).toFixed(1)}`,
  ].join('\n');
}

// ── Corpus shape guardrails ────────────────────────────────────────────────
// Cheap, non-todo sanity checks on discrimination-pairs.ts itself: these
// don't depend on the formula at all, so they're always hard assertions.
// They encode the file's own design constraint (6-10 scenes, 400-800 words,
// length-matched within a pair) so a future edit that breaks the "length
// can't explain the gap" premise fails immediately, before it ever reaches
// a health-score assertion.
describe('discrimination-pairs.ts corpus shape', () => {
  it('has exactly 6 pairs', () => {
    assert.equal(DISCRIMINATION_PAIRS.length, 6);
  });

  for (const pair of DISCRIMINATION_PAIRS) {
    it(`[${pair.id}] both halves are 6-10 scenes and 400-800 words, length-matched within ~20%`, () => {
      for (const half of [pair.good, pair.bad]) {
        const words = half.fountain.split(/\s+/).filter(Boolean).length;
        const scenes = (half.fountain.match(/^(INT\.|EXT\.)/gm) ?? []).length;
        assert.ok(
          scenes >= 6 && scenes <= 10,
          `"${half.label}" has ${scenes} scenes, expected 6-10`,
        );
        assert.ok(
          words >= 400 && words <= 800,
          `"${half.label}" has ${words} words, expected 400-800`,
        );
      }

      const goodWords = pair.good.fountain.split(/\s+/).filter(Boolean).length;
      const badWords = pair.bad.fountain.split(/\s+/).filter(Boolean).length;
      const ratio = Math.max(goodWords, badWords) / Math.min(goodWords, badWords);
      assert.ok(
        ratio <= 1.2,
        `"${pair.good.label}" (${goodWords}w) vs "${pair.bad.label}" (${badWords}w) differ by more than 20% — `
        + 'length could confound the craft comparison this pair exists to isolate',
      );
    });
  }
});

// ── Core discrimination assertions ────────────────────────────────────────
describe('discrimination harness — good craft must outscore bad craft', () => {
  for (const pair of DISCRIMINATION_PAIRS) {
    const isKnownDiscriminating = KNOWN_DISCRIMINATING.has(pair.id);
    const todoReason = isKnownDiscriminating
      ? undefined
      : `BLIND SPOT (${pair.axis}): ${BLIND_SPOT_NOTE[pair.id] ?? 'formula does not yet discriminate this axis'} — `
      + 'flip this test off todo once a Wave Program v2 detector closes the gap (re-measure gap first).';

    it(
      `[${pair.id}] "${pair.good.label}" scores higher health than "${pair.bad.label}"`,
      { todo: todoReason },
      async () => {
        const [good, bad] = await Promise.all([
          runScriptDoctor(pair.good.fountain),
          runScriptDoctor(pair.bad.fountain),
        ]);

        assert.ok(
          good.health > bad.health,
          diagnosticMessage(pair.id, pair.description, pair.good.label, pair.bad.label, good, bad),
        );
      },
    );
  }
});

// ── Composite margin regression guard ─────────────────────────────────────
// Pair 6 is the reviewer's original finding reconstructed at matched size.
// Beyond the plain good > bad check above, this asserts a MODEST minimum
// gap so a future fix doesn't just barely nudge the ordering (good=79.41,
// bad=79.40) and call it solved. The margin was measured, not guessed:
// originally the gap was ~0.0 (a dead tie), so 5.0 points was set as
// deliberate headroom above that noise floor, not a number picked to pass
// trivially. The W1 health-formula sensitivity wave's densityPenalty
// sub-1.0-density curve (see doctor.ts) moved this pair's gap from ~0.0 to
// +2.2 (good 72.2, bad 70.0) — real, measured progress, and this pair's
// good > bad ordering above is now a genuine (non-todo) pass — but 2.2 is
// still short of the 5.0-point floor here, so this specific assertion
// stays `todo` until a further wave (most likely an excellence detector or
// root-cause template — see BLIND_SPOT_NOTE above for why this is a
// composite-of-several-missing-signals gap, not a pure formula-sensitivity
// one) closes the remaining ~2.8 points.
describe('composite reviewer scenario — minimum-gap regression guard', () => {
  const COMPOSITE_MIN_GAP = 5.0;

  it(
    `composite pair shows a health gap of at least ${COMPOSITE_MIN_GAP} points, not just a bare ordering`,
    {
      todo: 'BLIND SPOT (composite-reviewer-scenario): current gap measures ~0.0 (a dead tie), far below the '
      + `${COMPOSITE_MIN_GAP}-point floor — flip off todo once the gap is measured to clear it with headroom.`,
    },
    async () => {
      const pair = DISCRIMINATION_PAIRS.find(p => p.id === 'composite-reviewer-scenario');
      assert.ok(pair, 'composite-reviewer-scenario pair must exist in discrimination-pairs.ts');

      const [good, bad] = await Promise.all([
        runScriptDoctor(pair!.good.fountain),
        runScriptDoctor(pair!.bad.fountain),
      ]);
      const gap = good.health - bad.health;

      assert.ok(
        gap >= COMPOSITE_MIN_GAP,
        diagnosticMessage(pair!.id, pair!.description, pair!.good.label, pair!.bad.label, good, bad)
        + `\n  required gap >= ${COMPOSITE_MIN_GAP}, got ${gap.toFixed(1)}`,
      );
    },
  );
});
