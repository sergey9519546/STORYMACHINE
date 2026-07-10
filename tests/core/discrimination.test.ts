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
// Current measured state (5 of 6 axes now discriminate; 1 blind spot
// worsened, root cause explained below):
//
//   escalation-vs-flat-repetition:    good 76.1 > bad 70.0  (gap +6.1) PASS
//   setup-payoff-vs-orphaned-setups:  good 74.6 > bad 70.0  (gap +4.6) PASS
//   subtext-vs-on-the-nose:           good 79.1 > bad 77.7  (gap +1.4) PASS (flipped this wave)
//   dramatized-vs-told-exposition:    good 74.0 > bad 72.6  (gap +1.4) PASS (flipped this wave)
//   composite-reviewer-scenario:      good 72.2 > bad 70.0  (gap +2.2) PASS ordering; 5.0-pt min-gap still FAILS
//   active-vs-passive-protagonist:    good 75.8 < bad 77.7  (gap -1.9) FAIL — WORSE than the prior tie
//
// active-vs-passive-protagonist is not a compression artifact: measured
// weighted-issue counts show the "good" (active-protagonist) half already
// fires MORE weighted issues than the "bad" (passive-protagonist) half (38
// vs 35) under the CURRENT rule set — some other axis (unrelated to
// protagonist agency) happens to fire more on the good sample. Sharpening
// the density curve's sensitivity (this wave's whole point) necessarily
// makes that existing wrong-direction gap MORE visible, not less — no
// density-curve reshaping can fix a case where the underlying issue-count
// signal itself disagrees with the desired ordering. This is the
// BLIND_SPOT_NOTE's "no signal distinguishes active from passive" finding
// confirmed at the measurement level, not a new defect.
//
// 5 of 6 pairs' plain good > bad ORDERING are now hard (non-todo)
// assertions — a regression there must fail CI immediately. Only
// active-vs-passive-protagonist's ordering stays `todo` (it measurably
// worsened — see above). The separate, stricter composite minimum-gap
// guard (COMPOSITE_MIN_GAP=5.0, below) also stays `todo`: composite's
// ordering passes but its margin (+2.2) doesn't clear that floor yet. Each
// remaining todo is a standing invitation to flip to a hard assertion the
// moment a Wave Program v2 detector (excellence detectors and root-cause
// templates are the most directly relevant wave types) closes that gap. Do
// NOT delete a todo without first re-running this file and confirming the
// gap actually closed.

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
  // Also flipped: the plain good > bad ORDERING now genuinely holds for the
  // composite pair too (+2.2, up from a dead tie) — but the separate
  // minimum-gap regression guard below (COMPOSITE_MIN_GAP=5.0) still does
  // not clear, so that second, stricter assertion stays `todo`.
  'composite-reviewer-scenario',
]);

/** Per-pair blind-spot note surfaced in the todo reason and, on a rare
 *  local non-todo run where the assertion fails anyway, the developer sees
 *  it inline via the message argument below rather than having to go dig up
 *  this comment block. */
const BLIND_SPOT_NOTE: Record<string, string> = {
  'active-vs-passive-protagonist':
    'no signal distinguishes a protagonist who drives decisions from one things merely happen to — and (measured '
    + 'by the W1 health-formula wave) the "active" half already fires MORE weighted issues than the "passive" '
    + 'half under the current rule set (38 vs 35), so this is a missing-detector gap, not a formula-sensitivity '
    + 'one; no density-curve change can close it',
  'composite-reviewer-scenario':
    "reproduces the reviewer's original finding directly: an overall well-crafted script and an overall "
    + 'poorly-crafted one of matched size scores only a modest gap (+2.2 as of the W1 health-formula wave, up '
    + 'from a dead tie) — real but short of the 5.0-point floor below',
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
