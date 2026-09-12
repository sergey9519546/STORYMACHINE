// server/lib/artifact-claims.ts — the ONE definition of the claims an exported
// artifact carries (2026-09-12, BUG-1 in
// docs/audits/2026-09-12-adversarial/server-data-tests.md).
//
// WHAT THIS FILE IS FOR. Every claim in the set is written by a formatter and read
// back by a parser, in three artifact shapes, by two different verifiers. The
// failure mode that matters is not "the formatter is wrong" — it is the formatter
// and the parser drifting apart, which is exactly what happened on 2026-09-11 when
// the verdict stamp moved from `<div>` to `<span>` and the CLI's scrape silently
// stopped firing (a forged verdict would have passed; only the forgery test's own
// sanity assertion caught it). So every pair in this file is tested as a ROUND
// TRIP, and the round trip runs over the real formatter's output, never over a
// hand-typed string that could be wrong in the same direction as the parser.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLengthLine, parseLengthLine, parseCount,
  encodePageRefs, decodePageRefs, resolvedPages, PAGE_REFS_UNAVAILABLE,
  claimRowsFor, decodeClaimRows, CLAIM_ROW_SPECS, LETTER_PROSE_CLAIMS, TIER_CLAIM_LABELS,
  percentileReadingFromText, referenceBoundsFromText, VERIFY_SCOPE_SENTENCE,
  type ArtifactClaims, type ArtifactPageRef,
} from '../../server/lib/artifact-claims.ts';
import {
  healthPercentileSentence, notComparableSentence, percentileBand, referenceBoundsLine,
} from '../../src/lib/percentile-copy.ts';
import { prioritiesHeadingFor, prioritiesHeadingUpper, prioritiesCountFromHeading } from '../../src/lib/priorities-copy.ts';
import { validateVerifyExpected } from '../../server/lib/verify-compare.ts';

const BASE_CLAIMS: ArtifactClaims = {
  contentHash: 'a'.repeat(64),
  health: 76.3,
  verdict: 'CONSIDER',
  totalIssues: 178,
  healthPercentile: 100,
  engineCommit: 'b'.repeat(40),
  rulebookCount: 3217,
  sceneCount: 13,
  wordCount: 824,
  estimatedPages: 4,
  estimatedRuntimeMinutes: 4,
  prioritiesListed: 3,
  percentileReading: 'not comparable',
  referenceBounds: referenceBoundsLine(),
  loglineState: 'derived',
  pageRefs: [
    { ordinal: 1, rule: 'NO_REVERSALS_LONG_STORY', id: '9bed77ed917160b0', page: null },
    { ordinal: 2, rule: 'WEAK_MIDPOINT', id: 'db081ff82116ca78', page: 2 },
    { ordinal: 3, rule: 'ACT2_BOUNDARY_WEAK', page: 11 },
  ],
};

describe('the Length line: formatter and parser are inverses', () => {
  const cases: Array<[string, Pick<ArtifactClaims, 'sceneCount' | 'wordCount' | 'estimatedPages' | 'estimatedRuntimeMinutes'>]> = [
    ['the ordinary case', { sceneCount: 13, wordCount: 824, estimatedPages: 4, estimatedRuntimeMinutes: 4 }],
    ['singular everything', { sceneCount: 1, wordCount: 1, estimatedPages: 1, estimatedRuntimeMinutes: 1 }],
    ['no page estimate at all', { sceneCount: 3, wordCount: 540 }],
    ['feature scale, thousands separators', { sceneCount: 231, wordCount: 19_293, estimatedPages: 79, estimatedRuntimeMinutes: 79 }],
    ['zero scenes', { sceneCount: 0, wordCount: 0 }],
  ];
  for (const [name, claims] of cases) {
    it(name, () => {
      const line = formatLengthLine(claims);
      const parsed = parseLengthLine(line);
      assert.deepEqual(parsed, {
        sceneCount: claims.sceneCount,
        wordCount: claims.wordCount,
        ...(claims.estimatedPages !== undefined ? { estimatedPages: claims.estimatedPages } : {}),
        ...(claims.estimatedRuntimeMinutes !== undefined
          ? { estimatedRuntimeMinutes: claims.estimatedRuntimeMinutes } : {}),
      }, `round trip failed for: ${line}`);
    });
  }

  it('finds the Length line inside real surrounding markup and prose', () => {
    const line = formatLengthLine({ sceneCount: 13, wordCount: 824, estimatedPages: 4, estimatedRuntimeMinutes: 4 });
    const html = `<div><span class="tier-key">Length</span> ${line}</div>`;
    const md = `**Length.** ${line}`;
    const txt = `Length: ${line}`;
    for (const doc of [html, md, txt]) {
      assert.deepEqual(parseLengthLine(doc), {
        sceneCount: 13, wordCount: 824, estimatedPages: 4, estimatedRuntimeMinutes: 4,
      });
    }
  });

  it('returns null when there is no Length line at all', () => {
    assert.equal(parseLengthLine('<p>nothing to see</p>'), null);
  });
});

describe('parseCount — the NaN discipline the 2026-09-06 review installed, extended to every new field', () => {
  // `Math.abs(NaN - x) > tolerance` is false, so an unreadable claim that reaches
  // the comparator reads as a MATCH. Every numeric claim therefore has to come
  // back as NaN (which zod refuses) rather than as a number, and the empty string
  // is the trap: `Number('')` is 0.
  for (const bad of ['', '   ', 'OUTSTANDING', '6.5.0', 'NaN', 'Infinity', '1e3', '0x10', '4 scenes', '--3']) {
    it(`${JSON.stringify(bad)} is not a readable count`, () => {
      assert.ok(Number.isNaN(parseCount(bad)), `${JSON.stringify(bad)} must not parse as a number`);
    });
  }
  it('undefined and null are not readable counts', () => {
    assert.ok(Number.isNaN(parseCount(undefined)));
    assert.ok(Number.isNaN(parseCount(null)));
  });
  it('reads a plain integer, a thousands-separated integer and a negative', () => {
    assert.equal(parseCount('13'), 13);
    assert.equal(parseCount('19,293'), 19_293);
    assert.equal(parseCount('76.3'), 76.3);
    // Negative parses as a NUMBER here and is refused by the schema's .min(0) —
    // this layer's job is readability, the schema's is range.
    assert.equal(parseCount('-3'), -3);
  });
});

describe('page references: encoder and decoder are inverses', () => {
  it('round-trips a mixed list (resolved, unresolved, no id)', () => {
    const encoded = encodePageRefs(BASE_CLAIMS.pageRefs!);
    assert.deepEqual(decodePageRefs(encoded), BASE_CLAIMS.pageRefs);
  });

  it('the encoding is readable by a human, not only by the parser', () => {
    assert.equal(
      encodePageRefs(BASE_CLAIMS.pageRefs!),
      '1 NO_REVERSALS_LONG_STORY#9bed77ed917160b0 no page; '
      + '2 WEAK_MIDPOINT#db081ff82116ca78 p. 2; 3 ACT2_BOUNDARY_WEAK p. 11',
    );
  });

  it('an empty list is "none", and decodes back to an empty list', () => {
    assert.equal(encodePageRefs([]), 'none');
    assert.deepEqual(decodePageRefs('none'), []);
  });

  it('the unavailable sentinel decodes to null (no claim), never to an empty list', () => {
    assert.equal(decodePageRefs(PAGE_REFS_UNAVAILABLE), null);
    assert.notDeepEqual(decodePageRefs(PAGE_REFS_UNAVAILABLE), []);
  });

  for (const bad of ['p. 4', '1 RULE', '1 RULE p. x', 'RULE p. 4', '1 RULE p. 4; garbage', '1 RULE#a#b p. 4', '']) {
    it(`refuses the malformed encoding ${JSON.stringify(bad)} rather than decoding part of it`, () => {
      assert.equal(decodePageRefs(bad), null);
    });
  }

  it('resolvedPages keeps only the pages a document actually prints, in order', () => {
    assert.deepEqual(resolvedPages(BASE_CLAIMS.pageRefs!), [2, 11]);
  });
});

describe('the claim rows: one label table, written and read by the same definition', () => {
  it('round-trips every field through claimRowsFor -> decodeClaimRows', () => {
    const rows = claimRowsFor(BASE_CLAIMS);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.label] = row.value;
    const decoded = decodeClaimRows(map);
    // healthPercentile is deliberately NOT published as a row (the tier prints a
    // BAND, never an exact ordinal — D5 false precision), so it is the one field
    // that cannot round-trip through the rendered block.
    const { healthPercentile, ...expected } = BASE_CLAIMS;
    assert.deepEqual(decoded, expected);
  });

  it('the pre-2026-09-12 labels are unchanged, so every report exported before today still parses', () => {
    const labels = CLAIM_ROW_SPECS.map(s => s.label);
    for (const legacy of [
      'Script-text hash (SHA-256, full)', 'Health', 'Verdict', 'Total issues',
      'Engine commit', 'Rulebook count',
    ]) {
      assert.ok(labels.includes(legacy), `the legacy label ${JSON.stringify(legacy)} must not be renamed`);
    }
  });

  it('every tier label the verifier insists on is actually a row the exporters write', () => {
    const labels = new Set(CLAIM_ROW_SPECS.map(s => s.label));
    for (const label of TIER_CLAIM_LABELS) {
      assert.ok(labels.has(label), `${label} is required of a tier artifact but is not in the row table`);
    }
  });

  it('the letter omits exactly the three claims it states in its own prose, and no others', () => {
    const rows = claimRowsFor(BASE_CLAIMS, { omit: LETTER_PROSE_CLAIMS }).map(r => r.label);
    assert.ok(!rows.includes('Script-text hash (SHA-256, full)'));
    assert.ok(!rows.includes('Engine commit'));
    assert.ok(!rows.includes('Rulebook count'));
    assert.ok(rows.includes('Scenes') && rows.includes('Words') && rows.includes('Page references'));
    assert.equal(rows.length, claimRowsFor(BASE_CLAIMS).length - 3);
  });

  it('a report with no page estimate, no percentile, no provenance and no page refs publishes exactly what it states', () => {
    const thin: ArtifactClaims = {
      contentHash: 'c'.repeat(64),
      health: 50,
      totalIssues: 0,
      sceneCount: 1,
      wordCount: 20,
      prioritiesListed: 0,
      referenceBounds: referenceBoundsLine(),
    };
    const labels = claimRowsFor(thin).map(r => r.label);
    assert.deepEqual(labels, [
      'Script-text hash (SHA-256, full)', 'Health', 'Total issues', 'Scenes', 'Words',
      'Priorities listed', 'Reference bounds', 'Page references',
    ]);
    // The one absence that is STATED rather than omitted: a missing page-references
    // row would let a forger claim the document never referenced a page.
    const pageRow = claimRowsFor(thin).find(r => r.label === 'Page references');
    assert.equal(pageRow?.value, PAGE_REFS_UNAVAILABLE);
  });

  it('an unreadable numeric row decodes to NaN, not to 0 or to nothing', () => {
    const decoded = decodeClaimRows({ Scenes: '', Words: 'lots', 'Total issues': '6.5.0' });
    assert.ok(Number.isNaN(decoded.sceneCount as number));
    assert.ok(Number.isNaN(decoded.wordCount as number));
    assert.ok(Number.isNaN(decoded.totalIssues as number));
  });

  it('an unreadable page-references row decodes to the raw string, so the schema can refuse it', () => {
    const decoded = decodeClaimRows({ 'Page references': 'p. 999' });
    assert.equal(decoded.pageRefs, 'p. 999');
  });
});

describe('the discrete readings: extractors invert the copy that prints them', () => {
  it('every band percentileBand can produce is recoverable from the sentence that prints it', () => {
    for (let pct = 0; pct <= 100; pct++) {
      const sentence = healthPercentileSentence(pct);
      assert.equal(percentileReadingFromText(sentence), percentileBand(pct), `pct ${pct}`);
    }
  });

  it('the not-comparable sentence reads back as "not comparable"', () => {
    assert.equal(percentileReadingFromText(notComparableSentence()), 'not comparable');
  });

  it('text with neither reading yields null', () => {
    assert.equal(percentileReadingFromText('<p>Health 76.3 / 100</p>'), null);
  });

  it('the reference bounds are recoverable from both places the page can state them', () => {
    const bounds = referenceBoundsLine();
    assert.equal(referenceBoundsFromText(`Reference bounds: ${bounds}.`), bounds);
    assert.equal(referenceBoundsFromText(notComparableSentence()), bounds,
      'the not-comparable sentence carries the bounds in its own parenthetical (reader-tier rule 4)');
  });

  it('a degenerate bound range ("10 scenes", not "10–10") still reads back', () => {
    const bounds = referenceBoundsLine({ samples: 20, minScenes: 10, maxScenes: 10, minWords: 300, maxWords: 300 });
    assert.equal(referenceBoundsFromText(`Reference bounds: ${bounds}.`), bounds);
  });

  it('every priorities heading states a count the verifier can read back', () => {
    for (let n = 0; n <= 20; n++) {
      assert.equal(prioritiesCountFromHeading(prioritiesHeadingFor(n)), n, `count ${n}`);
      assert.equal(prioritiesCountFromHeading(prioritiesHeadingUpper(n)), n, `upper-case count ${n}`);
    }
  });

  it('a heading that is not a priorities heading reads back as null, not as 0', () => {
    for (const other of ['Root Causes', 'Summary', '', 'The things to fix first']) {
      assert.equal(prioritiesCountFromHeading(other), null, JSON.stringify(other));
    }
  });
});

describe('VerifyExpectedSchema refuses an unreadable claim for EVERY new field', () => {
  // The 2026-09-06 round-2 finding, re-run against the fields added 2026-09-12:
  // a claim the comparator cannot compare must be a hard failure, never silence.
  const numericFields = [
    'sceneCount', 'wordCount', 'estimatedPages', 'estimatedRuntimeMinutes', 'prioritiesListed',
  ] as const;
  const badValues: Array<[string, unknown]> = [
    ['non-numeric', 'OUTSTANDING'],
    ['NaN', Number.NaN],
    ['negative', -1],
    ['a version string', parseCount('6.5.0')],
    ['empty string', parseCount('')],
    ['a float', 6.5],
    ['Infinity', Number.POSITIVE_INFINITY],
  ];
  for (const field of numericFields) {
    for (const [label, value] of badValues) {
      it(`${field} rejects ${label}`, () => {
        const failure = validateVerifyExpected({ contentHash: 'a'.repeat(64), [field]: value });
        assert.ok(failure, `${field} = ${String(value)} must not validate`);
        assert.equal(failure.field, field);
      });
    }
    it(`${field} accepts a real non-negative integer`, () => {
      assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), [field]: 13 }), null);
    });
  }

  it('percentileReading must be a band or "not comparable"', () => {
    for (const bad of ['', 'top', '101%', 'middle 50%', 'not-comparable', 'top 10 %']) {
      const failure = validateVerifyExpected({ contentHash: 'a'.repeat(64), percentileReading: bad });
      assert.ok(failure, `${JSON.stringify(bad)} must not validate`);
      assert.equal(failure.field, 'percentileReading');
    }
    for (const good of ['not comparable', 'top 10%', 'top 90%', 'bottom 10%']) {
      assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), percentileReading: good }), null, good);
    }
  });

  it('referenceBounds must read like the bounds line the copy module formats', () => {
    assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), referenceBounds: referenceBoundsLine() }), null);
    for (const bad of ['', '20 samples', 'twenty samples / 9–10 scenes / 256–337 words', '20 samples / 9-10 scenes / 256-337 words']) {
      const failure = validateVerifyExpected({ contentHash: 'a'.repeat(64), referenceBounds: bad });
      assert.ok(failure, `${JSON.stringify(bad)} must not validate`);
      assert.equal(failure.field, 'referenceBounds');
    }
  });

  it('loglineState is a two-value enum, not free text', () => {
    assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), loglineState: 'derived' }), null);
    assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), loglineState: 'not derived' }), null);
    for (const bad of ['', 'yes', 'Derived', 'unavailable']) {
      const failure = validateVerifyExpected({ contentHash: 'a'.repeat(64), loglineState: bad });
      assert.ok(failure);
      assert.equal(failure.field, 'loglineState');
    }
  });

  it('pageRefs must be a well-formed list, not a string and not a partial entry', () => {
    assert.equal(validateVerifyExpected({ contentHash: 'a'.repeat(64), pageRefs: BASE_CLAIMS.pageRefs }), null);
    const bads: unknown[] = [
      'p. 999',
      [{ ordinal: 1, rule: 'X' }],
      [{ ordinal: 0, rule: 'X', page: 1 }],
      [{ ordinal: 1, rule: '', page: 1 }],
      [{ ordinal: 1, rule: 'X', page: 0 }],
      [{ ordinal: 1, rule: 'X', page: Number.NaN }],
      [{ ordinal: 1, rule: 'X', page: 1, extra: 'x' }],
    ];
    for (const bad of bads) {
      const failure = validateVerifyExpected({ contentHash: 'a'.repeat(64), pageRefs: bad });
      assert.ok(failure, `${JSON.stringify(bad)} must not validate`);
      assert.equal(failure.field, 'pageRefs');
    }
  });
});

describe('the scope sentence names what is NOT checked', () => {
  // "No silent gaps" is the requirement. A gap that is written down is a scope; a
  // gap nobody wrote down is what BUG-1 actually was.
  it('states both halves, and names the three caller-supplied values', () => {
    assert.match(VERIFY_SCOPE_SENTENCE, /What is checked:/);
    assert.match(VERIFY_SCOPE_SENTENCE, /What is not checked:/);
    assert.match(VERIFY_SCOPE_SENTENCE, /page reference/);
    assert.match(VERIFY_SCOPE_SENTENCE, /title and author/);
    assert.match(VERIFY_SCOPE_SENTENCE, /draft-rank/);
    assert.match(VERIFY_SCOPE_SENTENCE, /logline’s text \(only whether one was derived\)/);
  });
});

describe('the page and the block are one statement', () => {
  it('every claim the tier renders is a claim the block publishes', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const { runScriptDoctor } = await import('../../server/nvm/analyze/doctor.ts');
    const { buildReaderTier } = await import('../../server/lib/reader-tier.ts');
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const fountain = readFileSync(path.join(repoRoot, 'data/screenplays/chain-of-custody.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    const tier = buildReaderTier(report, { fountain });

    // The Length line IS the claim, formatted — not a parallel render of it.
    assert.deepEqual(parseLengthLine(tier.lengthLine), {
      sceneCount: tier.claims.sceneCount,
      wordCount: tier.claims.wordCount,
      estimatedPages: tier.claims.estimatedPages,
      estimatedRuntimeMinutes: tier.claims.estimatedRuntimeMinutes,
    });
    assert.equal(prioritiesCountFromHeading(tier.prioritiesHeading), tier.claims.prioritiesListed);
    assert.equal(percentileReadingFromText(tier.percentileLine ?? ''), tier.claims.percentileReading ?? null);
    const boundsText = `${tier.percentileLine ?? ''} ${tier.boundsLine ?? ''}`;
    assert.equal(referenceBoundsFromText(boundsText), tier.claims.referenceBounds);
    assert.equal(tier.claims.loglineState, tier.logline === null ? 'not derived' : 'derived');

    // Every page reference the page prints is a page the block claims, in order.
    const printed = tier.priorities.map(p => p.pageRef).filter(Boolean).map(label => Number(label.slice(3)));
    assert.deepEqual(printed, resolvedPages(tier.claims.pageRefs ?? []));
    assert.ok((tier.claims.pageRefs ?? []).length === tier.priorities.length,
      'one claim entry per leading finding, including the ones with no resolvable page');
  });
});
