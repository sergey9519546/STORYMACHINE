// THE TWO FIELDS THE OWNER'S CORPUS RUN NEEDS (2026-09-12, round 3).
//
// `docs/p1-benchmark/MEASUREMENT_RECEIPTS.md`'s pending entry for this branch
// tells the owner to compare `submittedWordCount` against `wordCount` per
// script, split by whether `isDoubleSpaced` fires, BEFORE reading any rank
// statistic. When that instruction was written neither number could be
// obtained: `submittedWordCount` was a local in fountain-analyzer.ts that
// nothing read and that appeared on no type, and the double-spaced decision
// was private to screenplay-normalizer.ts. The round-2 review's non-blocking
// item 1 is that the branch's most important owner instruction was prose.
//
// These assertions exist so the two fields cannot quietly become wrong, a
// constant, or the same number as each other. Each is two-sided: a field that
// always returned 0, always returned `wordCount`, or always returned `false`
// fails at least one of them.

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { isDoubleSpacedText, normalizeScreenplay, joinWrappedDialogue } from '../../server/nvm/analyze/screenplay-normalizer.ts';
import { fastWordCount } from '../../server/lib/string-utils.ts';
import type { FountainAnalysis } from '../../server/nvm/analyze/types.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const FILES = [
  ...readdirSync(path.join(REPO_ROOT, 'data/screenplays')).filter((f) => f.endsWith('.fountain'))
    .map((f) => `data/screenplays/${f}`),
  ...readdirSync(path.join(REPO_ROOT, 'tests/fixtures/blind-pairs')).filter((f) => f.endsWith('.fountain'))
    .map((f) => `tests/fixtures/blind-pairs/${f}`),
].sort();
const read = (f: string): string => readFileSync(path.join(REPO_ROOT, f), 'utf8');

const analyses = new Map<string, FountainAnalysis>();
before(() => { for (const f of FILES) analyses.set(f, analyzeFountainText(read(f))); });

/** Re-emit a script the way a scraped PDF arrives: every line hard-wrapped at
 *  `cols` with a blank line after every line. No word is changed. */
function doubleSpace(text: string, cols = 45): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t === '') continue;
    let cur = '';
    for (const w of t.split(/\s+/)) {
      if (cur === '') cur = w;
      else if ((cur + ' ' + w).length <= cols) cur += ' ' + w;
      else { out.push(cur); cur = w; }
    }
    if (cur !== '') out.push(cur);
  }
  return out.join('\n\n') + '\n';
}

describe('submittedWordCount is the submission, not the screenplay', () => {
  it('is exactly the whitespace-token count of the bytes that arrived', () => {
    for (const f of FILES) {
      assert.equal(
        analyses.get(f)!.submittedWordCount, fastWordCount(read(f)),
        `${f}: submittedWordCount must be fastWordCount of the RAW submission — it is the "how much did `
        + 'the writer send" figure, and the owner subtracts wordCount from it to see how much of a draft '
        + 'is text Fountain never prints.',
      );
    }
  });

  it('is never below wordCount, and on this corpus is always above it', () => {
    let strictlyAbove = 0;
    for (const f of FILES) {
      const a = analyses.get(f)!;
      assert.ok(
        a.submittedWordCount >= a.wordCount,
        `${f}: submittedWordCount ${a.submittedWordCount} < wordCount ${a.wordCount}. The analyzed `
        + 'screenplay cannot contain words the submission did not.',
      );
      if (a.submittedWordCount > a.wordCount) strictlyAbove++;
    }
    assert.equal(
      strictlyAbove, FILES.length,
      `${strictlyAbove} of ${FILES.length} scripts have a non-zero gap. Every one of the 32 opens with its `
      + 'own CC0 licence record in a boneyard (24-151 words), so a corpus where the two numbers are equal '
      + 'means submittedWordCount has stopped measuring the submission.',
    );
  });

  it('a boneyard moves submittedWordCount and leaves wordCount alone', () => {
    // The two-sided check: this is exactly the padding attack the denominator
    // fix closed, and the diagnostic pair has to be able to SHOW it.
    const src = read(FILES[0]);
    const padded = `/*\n${'scheduling and budget discussion '.repeat(800)}\n*/\n\n${src}`;
    const a = analyzeFountainText(src);
    const b = analyzeFountainText(padded);
    assert.equal(b.wordCount, a.wordCount, 'the screenplay did not change, so the denominator must not');
    assert.ok(
      b.submittedWordCount > a.submittedWordCount + 3000,
      `submittedWordCount went ${a.submittedWordCount} -> ${b.submittedWordCount} under a 800-repetition `
      + 'boneyard. It must follow the submission, or the owner cannot see how much of a draft is not '
      + 'screenplay — which is the whole of step 1 of the receipt.',
    );
  });
});

describe('isDoubleSpaced is the split variable the receipt is built around', () => {
  it('is false on all 32 committed scripts — none of them is the corpus shape', () => {
    const yes = FILES.filter((f) => analyses.get(f)!.isDoubleSpaced);
    assert.deepEqual(
      yes, [],
      'a committed fixture now takes the double-spaced reconstruction branch. That branch is the private '
      + "corpus's own shape and the reason two of this branch's changes cannot be measured here; if a "
      + 'fixture reaches it, that claim needs re-checking, not this assertion relaxing.',
    );
  });

  it('is true on a double-spaced re-emission of every one of them', () => {
    for (const f of FILES) {
      assert.equal(
        analyzeFountainText(doubleSpace(read(f))).isDoubleSpaced, true,
        `${f} re-emitted at 45 columns with a blank line after every line did not register as `
        + 'double-spaced. That is the scraped-PDF shape; if the decision cannot see it, the owner\'s '
        + 'split is meaningless.',
      );
    }
  });

  it('agrees with the branch normalizeScreenplay actually takes', () => {
    // The decision must not merely be reported — it must be the SAME decision.
    // On a double-spaced text the reconstruction runs, so the normalizer's
    // output differs from the join alone; on a clean one it does not.
    const clean = read(FILES[0]);
    const messy = doubleSpace(clean);
    assert.equal(isDoubleSpacedText(messy), true);
    assert.notEqual(
      normalizeScreenplay(messy), joinWrappedDialogue(messy),
      'isDoubleSpacedText says the reconstruction branch is taken, but normalizeScreenplay returned what '
      + 'the join alone would. The reported decision and the taken decision have drifted.',
    );
    assert.equal(isDoubleSpacedText(clean), false);
  });

  it('does not fire on an empty or whitespace-only submission', () => {
    for (const t of ['', '   ', '\n\n\n']) {
      assert.equal(isDoubleSpacedText(t), false, `isDoubleSpacedText(${JSON.stringify(t)}) must be false`);
    }
    assert.equal(analyzeFountainText('').submittedWordCount, 0);
    assert.equal(analyzeFountainText('').isDoubleSpaced, false);
  });
});

describe('neither field reaches the score', () => {
  it('padding a boneyard moves submittedWordCount and nothing the writer is scored on', () => {
    const src = read(FILES[0]);
    const padded = `/* a production note about budget and scheduling */\n\n${src}`;
    const a = analyzeFountainText(src);
    const b = analyzeFountainText(padded);
    assert.ok(b.submittedWordCount > a.submittedWordCount);
    assert.equal(b.wordCount, a.wordCount);
    assert.equal(b.sceneCount, a.sceneCount);
    assert.equal(b.dialogueLineCount, a.dialogueLineCount);
    assert.equal(b.actionLineCount, a.actionLineCount);
  });
});
