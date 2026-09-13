// THE THREE-SCAN CONVERSION, SHOWN FAILING BEFORE IT IS SHOWN PASSING.
//
// `scripts/lib/receipt-conversion.mjs` closes a PENDING receipt entry after a
// real corpus run. The property that matters is not "it edits some text": it
// is that the gate's own `pendingReason` returns null afterwards, on entries
// built to trip each of its three scans in turn. Every fixture below is
// verified with the gate's OWN exported functions, never with a re-implemented
// check — a second copy of the scans would be a copy that agrees with itself.
//
// The last suite is the one that catches drift in the other direction: if the
// gate ever learns a fifth pending phrase, the converter has no rewrite for it
// and this file fails rather than the owner's run failing at 2am.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConversionError, PENDING_PHRASE_REWRITES, convertHeading, convertPendingEntries,
  fieldParagraph, findEntries, formatEdits, retensePhrases,
} from '../../scripts/lib/receipt-conversion.mjs';
import { PENDING_PHRASES, extractEntries, pendingReason, validateEntry } from '../../scripts/check-scoring-receipt.mjs';

const FACTS = {
  date: '2026-09-13',
  branch: 'scoring/example',
  // A real-shaped SHA (it carries digits): the gate ignores an all-letter
  // "hex" span, so an a-repeat fixture would hide the cited-object scan.
  filedAtSha: 'a4df0c49f24e356e45677f0550972f6bf589917a',
  runner: 'owner@workstation',
  auc24: 0.7083,
  actSwapAuc: 0.8125,
  baselineAuc24: 0.6875,
  baselineRef: 'main',
  corpusScriptCount: 73,
  manifestScriptCount: 72,
  manifestHash: 'b'.repeat(64),
  corpusFingerprint: 'c'.repeat(64),
  subsetSize: 24,
  degradationId: 'shuffle-drop/v2',
  floor: 0.622,
};

/** An entry that trips scan ONE only: a PENDING parenthetical in the heading. */
const SCAN_ONE = `### 2026-09-07 — EXAMPLE: a scoring change (PENDING OWNER MEASUREMENT — no real-corpus run happened)

**Branch:** \`scoring/example\`.

- **Command:** \`npm run benchmark:public\`.
- **Corpus fingerprint:** none for AUC-24 — no private corpus was read.
- **Git SHA:** measured at each commit in turn.
- **Runner attestation:** I ran every command listed above myself.

**What changed.** One constant.
`;

/** An entry that trips scan TWO: a phrase, wrapped across a line break so a
 *  single-line search would miss it — the case the owner note measured. */
const SCAN_TWO = `### 2026-09-08 — EXAMPLE TWO: another scoring change (ledger row)

- **Command:** \`npm run benchmark:public\`.
- **Corpus fingerprint:** none for AUC-24.
- **Git SHA:** \`${'a4df0c49f24e356e45677f0550972f6bf589917a'}\`.
- **Runner attestation:** I ran the public benchmark myself.

**What the owner still owes.** The AUC-24 for this range has
not been run, and is the owner's step.
`;

/** An entry that trips scan THREE: the bare word inside a required field's
 *  VALUE WINDOW, which runs past the field's own paragraph to the next `- **`
 *  bullet and swallows the prose below it. */
const SCAN_THREE = `### 2026-09-09 — EXAMPLE THREE: a third scoring change (ledger row)

- **Command:** \`npm run benchmark:public\`.
- **Corpus fingerprint:** none for AUC-24.
- **Git SHA:** \`${'a4df0c49f24e356e45677f0550972f6bf589917a'}\`.
- **Runner attestation:** I ran the public benchmark myself, in the foreground.

  This entry's own heading says PENDING, and that is the honest marker until
  the corpus run exists.
`;

/** Fields in an order that is NOT the converter's own list order, with the
 *  required ones interleaved with unrelated bullets. */
const SHUFFLED_FIELDS = `### 2026-09-10 — EXAMPLE FOUR: fields in document order (PENDING OWNER MEASUREMENT)

- **Git SHA:** measured at each commit in turn.
- **What changed:** one constant, and three report defects.
- **Measured AUC-24:** **PENDING** — no corpus in this environment.
- **Command:** \`npm run benchmark:public\`.
- **Runner attestation:** I ran the public benchmark myself.
- **Corpus fingerprint:** none for AUC-24.

**A closing paragraph that must survive.** Its text is the entry's evidence.
`;

function entryOf(text: string) {
  const [entry] = extractEntries(text.split('\n'));
  return entry;
}

function convert(text: string, facts = FACTS) {
  const only = new Set([entryOf(text).heading]);
  return convertPendingEntries(text, facts, { only });
}

describe('each scan fires on the input it exists for, BEFORE the conversion', () => {
  it('scan one — the heading', () => {
    assert.match(pendingReason(entryOf(SCAN_ONE))!, /heading contains "PENDING"/);
  });
  it('scan two — a phrase wrapped across a line break', () => {
    assert.match(pendingReason(entryOf(SCAN_TWO))!, /the entry states "has\s+not\s+been\s+run"/);
  });
  it('scan three — the bare word inside a required field VALUE window', () => {
    assert.match(pendingReason(entryOf(SCAN_THREE))!, /\*\*Runner attestation\*\* field contains "PENDING"/);
  });
  it('scan three is not the same as scan one: this entry\'s heading is clean', () => {
    assert.doesNotMatch(entryOf(SCAN_THREE).heading, /PENDING/);
  });
});

describe('after the conversion, all three come back clean', () => {
  for (const [label, text] of [
    ['scan one', SCAN_ONE], ['scan two', SCAN_TWO], ['scan three', SCAN_THREE],
    ['fields in document order', SHUFFLED_FIELDS],
  ] as const) {
    it(`${label}: pendingReason is null and validateEntry reports 0 problems`, () => {
      const { text: converted, converted: edits } = convert(text);
      assert.equal(edits.length, 1, 'exactly one entry should have been converted');
      const entry = entryOf(converted);
      assert.equal(pendingReason(entry), null, `still pending: ${pendingReason(entry)}`);
      const problems = validateEntry(entry, { objectExists: () => true });
      assert.deepEqual(problems, [], problems.join('\n'));
    });
  }

  it('the measured number, the fingerprint, the SHA and the runner all land in the entry', () => {
    const { text } = convert(SCAN_ONE);
    assert.match(text, /0\.7083/);
    assert.match(text, /shuffle-drop\/v2/);
    assert.match(text, new RegExp(FACTS.corpusFingerprint.slice(0, 16)));
    assert.match(text, new RegExp(FACTS.filedAtSha));
    assert.match(text, /owner@workstation/);
    assert.match(text, /2026-09-13/);
  });

  it('the baseline number is carried beside the branch number, on the same recipe', () => {
    const { text } = convert(SCAN_ONE);
    assert.match(text, /Same recipe, same corpus, main in the same run: \*\*0\.6875\*\*/);
    assert.match(text, /NOT comparable to the 0\.731/);
  });

  it('cites no git object it cannot resolve — the fingerprint is not a SHA', () => {
    // The gate reads every whole backticked span of 7-40 hex digits as a CITED
    // GIT OBJECT (the check that exposed the 2026-08-08 fabrication), so a bare
    // hex fingerprint in backticks fails the entry. Caught by the end-to-end
    // fixture, pinned here: the ONLY object this conversion cites is the tip it
    // was measured on.
    const { text } = convert(SCAN_ONE);
    const entry = entryOf(text);
    const cited = new Set<string>();
    for (const line of [entry.heading, ...entry.lines]) {
      for (const m of line.matchAll(/`([0-9a-f]{7,40})`/g)) if (/[0-9]/.test(m[1])) cited.add(m[1]);
    }
    assert.deepEqual([...cited].sort(), [FACTS.filedAtSha, FACTS.filedAtSha.slice(0, 8)].sort());
    assert.match(text, /`sha256:/, 'a hash that is not a git object must say what it is');
  });

  it('the entry says, in its own text, that its body is the entry AS FILED', () => {
    const { text } = convert(SCAN_ONE);
    assert.match(text, /CONVERTED 2026-09-13 BY `npm run owner:measure`/);
    assert.match(text, /the entry AS FILED/);
    assert.match(text, new RegExp(FACTS.filedAtSha.slice(0, 8)));
  });

  it('prose the converter did not rewrite survives verbatim', () => {
    const { text } = convert(SHUFFLED_FIELDS);
    assert.match(text, /\*\*A closing paragraph that must survive\.\*\* Its text is the entry's evidence\./);
    assert.match(text, /- \*\*What changed:\*\* one constant, and three report defects\./);
  });

  it('a field the entry never carried is INSERTED, not skipped', () => {
    const withoutFingerprint = SCAN_ONE.replace(/- \*\*Corpus fingerprint:\*\*[^\n]*\n/, '');
    assert.doesNotMatch(withoutFingerprint, /Corpus fingerprint/);
    const { text } = convert(withoutFingerprint);
    assert.match(text, /- \*\*Corpus fingerprint:\*\* 73 eligible scripts/);
    assert.deepEqual(validateEntry(entryOf(text), { objectExists: () => true }), []);
  });
});

describe('scope: only the entries the RANGE adds', () => {
  // MEASURED 2026-09-13 on scoring/renderer-residuals: pendingReason flags FOUR
  // entries in that ledger, and one of them (2026-09-06, P3 VERIFY-REPORT CLI)
  // is merged history the real CLI never validates — its attestation window
  // swallows prose mentioning the pending branches. A converter that rewrote
  // every pending-looking entry would edit merged history to fix a problem
  // nothing reports.
  const twoEntries = `${SCAN_ONE}\n${SCAN_THREE}`;

  it('converts only the heading it was given, and reports the rest', () => {
    const only = new Set([entryOf(SCAN_ONE).heading]);
    const result = convertPendingEntries(twoEntries, FACTS, { only });
    assert.equal(result.converted.length, 1);
    assert.deepEqual(result.outOfScope, [entryOf(SCAN_THREE).heading]);
    const [, second] = extractEntries(result.text.split('\n'));
    assert.notEqual(pendingReason(second), null, 'the out-of-scope entry must be left exactly as it was');
  });

  it('with no scope given, every pending entry is converted', () => {
    const result = convertPendingEntries(twoEntries, FACTS);
    assert.equal(result.converted.length, 2);
    for (const entry of extractEntries(result.text.split('\n'))) {
      assert.equal(pendingReason(entry), null);
    }
  });
});

describe('the phrase table cannot drift from the gate', () => {
  it('every phrase the gate scans for has a rewrite', () => {
    for (const phrase of PENDING_PHRASES) {
      assert.ok(
        PENDING_PHRASE_REWRITES[phrase],
        `the gate scans for "${phrase}" and the converter has no rewrite for it`,
      );
    }
  });
  it('no rewrite re-matches any phrase the gate scans for', () => {
    for (const replacement of Object.values(PENDING_PHRASE_REWRITES)) {
      for (const phrase of PENDING_PHRASES) {
        const re = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i');
        assert.doesNotMatch(replacement, re, `"${replacement}" still matches "${phrase}"`);
      }
    }
  });
  it('a rewrite re-tenses rather than deletes, and keeps the sentence', () => {
    const { text, hits } = retensePhrases('The run has not been run and is the owner\'s step.');
    assert.deepEqual(hits, ['has not been run']);
    assert.equal(text, 'The run had not been run as of filing and is the owner\'s step.');
  });
  it('a phrase wrapped across a line break is still caught (the \\s+ trap)', () => {
    const { hits } = retensePhrases('the AUC-24 for this range has\nnot been run and is the owner\'s step');
    assert.deepEqual(hits, ['has not been run']);
  });
  it('capitalisation is preserved', () => {
    assert.match(retensePhrases('Was not run, as filed.').text, /^Had not been run as of filing/);
  });
  it('a phrase the converter cannot rewrite is a REFUSAL, not a silent pass', () => {
    const saved = PENDING_PHRASES.slice();
    PENDING_PHRASES.push('never happened at all');
    try {
      assert.throws(() => retensePhrases('this never happened at all'), (err: unknown) => {
        assert.ok(err instanceof ConversionError);
        assert.match((err as Error).message, /knows a pending phrase this converter does not/);
        return true;
      });
    } finally {
      PENDING_PHRASES.length = 0;
      PENDING_PHRASES.push(...saved);
    }
  });
});

describe('refusals', () => {
  it('refuses a heading whose PENDING is not in a parenthetical', () => {
    assert.throws(
      () => convertHeading('### 2026-09-07 — EXAMPLE, PENDING the owner run', FACTS),
      (err: unknown) => {
        assert.ok(err instanceof ConversionError);
        assert.match((err as Error).message, /scan one: the heading still contains/);
        return true;
      },
    );
  });
  for (const missing of ['date', 'filedAtSha', 'runner', 'corpusFingerprint', 'manifestHash', 'degradationId']) {
    it(`refuses to write a receipt with no \`${missing}\``, () => {
      const facts: Record<string, unknown> = { ...FACTS };
      delete facts[missing];
      assert.throws(() => convert(SCAN_ONE, facts as never), (err: unknown) => {
        assert.ok(err instanceof ConversionError, String(err));
        assert.match((err as Error).message, new RegExp(missing));
        return true;
      });
    });
  }
  it('refuses a short filedAtSha — a receipt names a commit a reviewer can check out', () => {
    assert.throws(() => convert(SCAN_ONE, { ...FACTS, filedAtSha: 'a4df0c49' }), /full 40-character SHA/);
  });
  it('a heading whose PENDING is not a parenthetical refuses through the whole conversion', () => {
    const stubborn = SCAN_ONE.replace(
      '### 2026-09-07 — EXAMPLE: a scoring change (PENDING OWNER MEASUREMENT — no real-corpus run happened)',
      '### 2026-09-07 — EXAMPLE, PENDING the owner run',
    );
    assert.throws(() => convert(stubborn), (err: unknown) => {
      assert.ok(err instanceof ConversionError);
      assert.match((err as Error).message, /scan one: the heading still contains/);
      return true;
    });
  });

  it('an entry that cannot be closed names the entry AND the scan, and returns no text', () => {
    // THE KNOWN LIMIT OF A MECHANICAL REWRITE, pinned rather than hidden. The
    // gate finds a field label ANYWHERE on a line; this converter's own label
    // pattern is anchored to the start of a line (optionally after a bullet
    // marker), because a mid-sentence `**Command:**` is prose about a command,
    // not a field, and replacing the rest of that paragraph would delete a
    // sentence. So an entry that puts a required label mid-line AND a PENDING
    // marker after it cannot be closed mechanically — and says so, naming the
    // entry and the scan, rather than committing something that fails CI.
    const stubborn = SCAN_ONE
      .replace('- **Command:** `npm run benchmark:public`.\n', '')
      .replace(
        '**Branch:** `scoring/example`.',
        '**Branch:** `scoring/example`. Its **Command:** list is PENDING the owner run.',
      );
    assert.throws(() => convert(stubborn), (err: unknown) => {
      assert.ok(err instanceof ConversionError, String(err));
      assert.match((err as Error).message, /still PENDING after conversion/);
      assert.ok((err as ConversionError).detail.some((l: string) => /EXAMPLE: a scoring change/.test(l)), 'the refusal must name the entry');
      return true;
    });
  });
});

describe('the pieces the conversion is built from', () => {
  it('findEntries spans an entry from its heading to the next one', () => {
    const spans = findEntries(`${SCAN_ONE}\n${SCAN_THREE}`.split('\n'));
    assert.equal(spans.length, 2);
    assert.ok(spans[0].end <= spans[1].start);
  });
  it('fieldParagraph stops at the next bullet, not at the end of the entry', () => {
    const lines = SCAN_ONE.split('\n');
    const para = fieldParagraph(lines, 0, lines.length, 'Command')!;
    assert.equal(para.end - para.start, 1);
    assert.match(lines[para.start], /\*\*Command:\*\*/);
  });
  it('fieldParagraph returns null for a field the entry does not carry', () => {
    const lines = SCAN_ONE.split('\n');
    assert.equal(fieldParagraph(lines, 0, lines.length, 'Flag-run AUCs'), null);
  });
  it('formatEdits prints the before and after of every edit', () => {
    const { converted } = convert(SCAN_ONE);
    const diff = formatEdits(converted);
    assert.match(diff, /@@ one \(heading\)/);
    assert.match(diff, /@@ field \*\*Runner attestation\*\*/);
    assert.match(diff, /^\s+\+ /m);
    assert.match(diff, /^\s+- /m);
  });
});
