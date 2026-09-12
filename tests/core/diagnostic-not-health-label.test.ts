// Exactly one number in a report may be presented as the health of the draft.
//
// ── The defect (2026-09-12 adversarial audit, finding #9, presentation half) ──
//
// On the product's own demo script (`dead-frequency`, which
// data/screenplays/LICENSE-live-action.md documents as "strong"-band calibration
// material) one report stated three different health numbers:
//
//   * the header:                   VERDICT CONSIDER · HEALTH 78
//   * Story Structure Analysis:     "Health score: 35/100"
//   * Structural Analysis:          "Graph Health 37/100 −9hp"
//
// The third printed its deduction in the header's own "hp" unit, in stamp red,
// with no caption — so a reader could not tell that 9 points had not been
// subtracted from anything. `server/nvm/analyze/types.ts` already said what those
// panels are: "`graphDeduction` is a potential 0–15 point value, NOT part of
// health/verdict until repaired graph extraction passes real-writing
// calibration."
//
// The fix labels each number where it appears, from ONE shared copy module, and
// renames the mid-report line so it no longer borrows the header's own two words.
// The clue/name half of finding #9 (a name/title guard on the clue extractor) is
// scoring-path work and is deliberately NOT touched here.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DIAGNOSTIC_NOT_IN_HEALTH_LABEL,
  diagnosticNotInHealthSentence,
} from '../../src/lib/diagnostic-copy.ts';

const REPO = path.resolve(import.meta.dirname, '../..');
const panel = readFileSync(
  path.join(REPO, 'src/components/scriptide/ScriptDoctorPanel.tsx'),
  'utf8',
);
const types = readFileSync(path.join(REPO, 'server/nvm/analyze/types.ts'), 'utf8');

describe('the copy module', () => {
  it('says "diagnostic — not part of Health" in the badge', () => {
    assert.match(DIAGNOSTIC_NOT_IN_HEALTH_LABEL, /diagnostic/i);
    assert.match(DIAGNOSTIC_NOT_IN_HEALTH_LABEL, /not part of Health/i);
  });

  it('the sentence names the number AND denies both health and verdict', () => {
    const sentence = diagnosticNotInHealthSentence('Graph Health');
    assert.match(sentence, /^Graph Health /);
    assert.match(sentence, /not part of the Health score or the verdict/);
    // "Not applied" is the half finding #9's reader could not discover: the
    // deduction is printed, and nothing was taken off.
    assert.match(sentence, /nothing here has been added to or subtracted from them/);
  });

  it('the engine type it quotes still says the same thing (the authority, not a memory of it)', () => {
    assert.match(
      types,
      /graphDeduction` is a\s*\n?\s*\*?\s*potential 0–15 point value, NOT part of health\/verdict/,
      'server/nvm/analyze/types.ts no longer says graphDeduction is outside health/verdict — '
        + 'if the signal was calibrated and wired, this label is now wrong and must be revisited',
    );
  });
});

describe('ScriptDoctorPanel labels every diagnostic score it renders', () => {
  it('imports the shared copy rather than writing its own', () => {
    // 2026-09-12 (adversarial finding #11): the assertion used to pin the
    // import's exact three lines, which meant ADDING a third shared symbol to
    // the same import — `unappliedDeductionLine`, so the panel stops
    // hand-writing `−{graphDeduction}hp` — failed a test about whether the copy
    // is shared. It now asserts what it is about: one import statement, from
    // that module, carrying every symbol the panel renders diagnostic copy with.
    const importBlock = panel.match(
      /import \{([\s\S]*?)\} from "\.\.\/\.\.\/lib\/diagnostic-copy\.ts";/,
    );
    assert.ok(importBlock, 'the panel must import its diagnostic copy from src/lib/diagnostic-copy.ts');
    for (const symbol of [
      'DIAGNOSTIC_NOT_IN_HEALTH_LABEL',
      'diagnosticNotInHealthSentence',
      'unappliedDeductionLine',
    ]) {
      assert.ok(importBlock[1].includes(symbol), `the panel must import ${symbol} from the shared module`);
    }
    assert.equal(
      (panel.match(/from "\.\.\/\.\.\/lib\/diagnostic-copy\.ts"/g) ?? []).length,
      1,
      'one import of the shared module, not several',
    );
  });

  it('renders four labelled slots — a badge and a caption for each of the two sections', () => {
    const marked = (panel.match(/data-diagnostic-not-health/g) ?? []).length;
    assert.equal(
      marked,
      4,
      `expected 4 labelled diagnostic slots (2 section badges + 2 per-number captions), found ${marked}`,
    );
    const badges = (panel.match(/\{DIAGNOSTIC_NOT_IN_HEALTH_LABEL\}/g) ?? []).length;
    const captions = (panel.match(/diagnosticNotInHealthSentence\('/g) ?? []).length;
    assert.equal(badges, 2, `expected 2 section badges, found ${badges}`);
    assert.equal(captions, 2, `expected 2 per-number captions, found ${captions}`);
  });

  it('the Story Structure section carries the badge and captions its own number', () => {
    const section = panel.slice(
      panel.indexOf('Story Structure Analysis'),
      panel.indexOf('{/* Critical Issues */}'),
    );
    assert.ok(section.length > 0, 'Story Structure Analysis section not found');
    assert.match(section, /\{DIAGNOSTIC_NOT_IN_HEALTH_LABEL\}/);
    assert.match(section, /diagnosticNotInHealthSentence\('The graph health score'\)/);
  });

  it('that section no longer calls its number "Health score" — the header\'s own two words', () => {
    const section = panel.slice(
      panel.indexOf('Graph-based structural diagnostics'),
      panel.indexOf('{/* Critical Issues */}'),
    );
    assert.ok(section.length > 0);
    assert.match(section, /Graph health score: \{storyGraph\.graphHealth\}\/100/);
    assert.doesNotMatch(
      section.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''),
      /[^h]Health score: \{storyGraph/,
      'the mid-report diagnostic must not be labelled with the same words as the document\'s health',
    );
  });

  it('the Graph Health card carries the caption beside the number itself', () => {
    const card = panel.slice(
      panel.indexOf('<span className="text-xs font-bold text-black dark:text-gray-100">Graph Health</span>'),
      panel.indexOf('Disclosure & Epistemics'),
    );
    assert.ok(card.length > 0, 'Graph Health card not found');
    // The number and the deduction still render — nothing is removed.
    assert.match(card, /\{report\.graphHealth\.graphHealthScore\}\/100/);
    // 2026-09-12 (adversarial finding #11): this used to require the literal
    // `−{report.graphHealth.graphDeduction}hp` — the exact rendering the finding
    // names, a potential deduction printed signed, in stamp red, in the headline
    // health's own unit, for a field types.ts:403-405 documents as NOT part of
    // health. The magnitude is still required to render (nothing removed); what
    // is now required is that it renders through the shared, unsigned copy.
    assert.match(card, /unappliedDeductionLine\(report\.graphHealth\.graphDeduction\)/);
    assert.doesNotMatch(
      card.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''),
      /−\{report\.graphHealth\.graphDeduction\}/,
      'an unapplied deduction must never render with a minus sign',
    );
    // …and now the card says what they are.
    assert.match(card, /diagnosticNotInHealthSentence\('Graph Health'\)/);
    assert.match(card, /data-diagnostic-not-health/);
  });
});
