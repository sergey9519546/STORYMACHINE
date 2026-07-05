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
// Running this harness today (see the per-pair results wired into
// KNOWN_DISCRIMINATING below) shows the current formula reproduces the
// reviewer's finding almost exactly: every pair scores in a narrow ~78-80
// band regardless of craft, and 4 of 6 pairs fail outright (bad >= good).
// Only 2 of 6 axes currently discriminate, and by tiny margins:
//
//   escalation-vs-flat-repetition:    good 79.6 > bad 78.7  (gap +0.9) PASS
//   setup-payoff-vs-orphaned-setups:  good 79.5 > bad 79.1  (gap +0.4) PASS
//   subtext-vs-on-the-nose:           good 79.6 < bad 79.7  (gap -0.1) FAIL
//   active-vs-passive-protagonist:    good 79.6 < bad 79.7  (gap -0.1) FAIL
//   dramatized-vs-told-exposition:    good 78.9 < bad 79.6  (gap -0.7) FAIL
//   composite-reviewer-scenario:      good 79.4 = bad 79.4  (gap  0.0) FAIL
//
// The 2 PASSING pairs are hard (non-todo) assertions from day one — the
// formula already gets them right and a regression there must fail CI
// immediately. The 4 FAILING pairs are `{ todo: '<blind spot>' }` so the
// suite stays green today; each todo is a standing invitation to flip to a
// hard assertion the moment a Wave Program v2 detector (excellence
// detectors and root-cause templates are the most directly relevant wave
// types) closes that gap. Do NOT delete a todo without first re-running
// this file and confirming the gap actually closed.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { DISCRIMINATION_PAIRS } from '../../server/nvm/analyze/calibration/discrimination-pairs.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

/** Pair ids the CURRENT formula already discriminates correctly (measured
 *  above). Everything else gets a `todo` so a real regression on these two
 *  fails CI today, while the known blind spots don't turn the suite red for
 *  a limitation this file exists to document, not silently paper over. */
const KNOWN_DISCRIMINATING = new Set<string>([
  'escalation-vs-flat-repetition',
  'setup-payoff-vs-orphaned-setups',
]);

/** Per-pair blind-spot note surfaced in the todo reason and, on a rare
 *  local non-todo run where the assertion fails anyway, the developer sees
 *  it inline via the message argument below rather than having to go dig up
 *  this comment block. */
const BLIND_SPOT_NOTE: Record<string, string> = {
  'subtext-vs-on-the-nose':
    'no signal rewards elliptical/withheld dialogue over characters narrating feelings and stakes aloud',
  'active-vs-passive-protagonist':
    'no signal distinguishes a protagonist who drives decisions from one things merely happen to',
  'dramatized-vs-told-exposition':
    'no signal penalizes info-dump/"as you know" exposition relative to conflict-revealed information',
  'composite-reviewer-scenario':
    "reproduces the reviewer's original finding directly: an overall well-crafted script and an overall "
    + 'poorly-crafted one of matched size land within noise of each other',
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
// bad=79.40) and call it solved. The margin was measured, not guessed: the
// CURRENT gap is ~0.0 (a dead tie — see the ledger above), so 5.0 points is
// deliberate headroom above today's noise floor, not a number picked to
// pass trivially. This is `todo` for the same reason the pair-6 check above
// is: the current formula doesn't clear it yet.
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
