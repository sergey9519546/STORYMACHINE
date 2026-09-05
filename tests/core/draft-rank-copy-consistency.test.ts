// src/lib/draft-rank-copy.ts's draftRankSentence() — cross-surface proof
// that the panel (ScriptDoctorPanel.tsx's DraftRankLine), the exported
// coverage HTML (coverage-html.ts's buildDraftRankLine), the Versions-list
// badge (SnapshotManager.tsx's SnapshotPercentileAndRankLine), and the
// coverage LETTER (coverage-letter.ts's buildCaveats) render the SAME thing
// for the same DraftRank input, for every state each scope can carry:
//   - ranked (no tie, no unscored records)
//   - tied (>= 1 other counted draft shares the exact same health)
//   - ranked + unscored (some saved records carry no health at all)
//   - first draft / only saved draft (of <= 1 — nothing else to rank against)
//   - (union scope only) nothing scored yet (rank: null)
//
// HISTORY. coverage-html.ts's buildDraftRankLine was added by the
// cross-surface-parity lane BEFORE draft-rank-copy.ts existed and was never
// migrated once the panel and the letter moved onto its granular helpers
// (draftRankDenominatorLabel/draftRankNextOpportunityLabel/
// unrankedDraftsNote) — that migration closed the NOUN drift (2026-09-05,
// first pass). It left SnapshotManager.tsx's 'saved'-scope Versions badge as
// a FOURTH hand-copy: it called draftRankDenominatorLabel('saved') for the
// noun but still hand-composed the sentence around it, with no "tied"
// prefix and no unrankedDraftsNote() call (client-hunter finding B-12,
// same day, second pass) — a genuine dead heat between two saved Versions
// read as clean separation, and an unscored sibling Version silently
// vanished from the "of N" count. Fixing B-12 also surfaced a THIRD, latent
// bug: unrankedDraftsNote() itself hardcoded the UNION denominator with no
// scope argument, so even a correct 'saved'-scope caller would have
// rendered "... runs and saved drafts ... are unranked" — wrong noun for
// that scope. All three are fixed together here: draftRankSentence(
// draftRank, scope) is now the ONE implementation of the whole sentence
// (every branch, both scopes), and the panel/HTML/badge all call it instead
// of composing anything themselves.
//
// No React render harness exists in this repo (see tests/core/
// shape-rhythm-panel-copy.test.ts's own header), so the panel and
// SnapshotManager sides are proven by (a) unit-testing draftRankSentence()
// itself directly — the strongest available proof, since it is now the
// literal function both components call — and (b) a source-text assertion
// (tests/core/percentile-copy-consistency.test.ts's "no surface
// re-implements it" block) that each component's source actually calls it.
// The coverage HTML export and the letter are pure functions, so their
// sides are proven end-to-end by actually calling them.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ordinal } from '../../src/lib/percentile-copy.ts';
import {
  draftRankSentence, draftRankDenominatorLabel, draftRankNextOpportunityLabel, unrankedDraftsNote,
} from '../../src/lib/draft-rank-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import type { ScriptDoctorReport, DoctorGrade, CoverageVerdict } from '../../server/nvm/analyze/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const panelSrc = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
const snapshotManagerSrc = read('../../src/components/scriptide/SnapshotManager.tsx');
const coverageHtmlSrc = read('../../server/lib/coverage-html.ts');

type DraftRankInput = { rank: number | null; of: number; tied?: boolean; unscored?: number };

function minimalReport(): ScriptDoctorReport {
  return {
    health: 78.3,
    grade: 'strong' as DoctorGrade,
    totalIssues: 0,
    bySeverity: { critical: 0, major: 0, minor: 0 },
    passes: [],
    sceneHeatmap: [],
    topPriorities: [],
    structure: {
      actPosition: 'act2b', completionPercent: 50, avgSuspensePerScene: 3,
      escalating: true, reversalCount: 0, reversalDensity: 0, approachingClimax: false,
      openClues: 0, revelationCount: 0, midpointPressure: 0, tightestScene: 0,
    },
    characters: [],
    sceneCount: 3,
    wordCount: 100,
    analyzedAt: Date.UTC(2026, 8, 5),
    verdict: 'RECOMMEND' as CoverageVerdict,
    dimensions: [],
    strengths: [],
    plainSummary: 'A clean report.',
  };
}

// Wire-shape cases: what the coverage-letter/HTML routes actually accept
// (rank always a number — draftRankExportPayload never forwards rank:null).
type DraftRankWireInput = { rank: number; of: number; tied?: boolean; unscored?: number };
const UNION_WIRE_CASES: Array<{ name: string; draftRank: DraftRankWireInput }> = [
  { name: 'ranked', draftRank: { rank: 2, of: 5 } },
  { name: 'tied', draftRank: { rank: 1, of: 6, tied: true } },
  { name: 'ranked + unscored', draftRank: { rank: 1, of: 3, unscored: 2 } },
  { name: 'first draft', draftRank: { rank: 1, of: 1 } },
];

describe('draftRankSentence() — union scope, every DraftRank state', () => {
  it('ranked, untied, no unscored siblings', () => {
    assert.equal(
      draftRankSentence({ rank: 2, of: 5 }, 'union'),
      'Rank among your drafts: 2nd of 5 runs and saved drafts of this script (by health)',
    );
  });

  it('tied — prefixes "tied " rather than reading as clean separation', () => {
    assert.equal(
      draftRankSentence({ rank: 1, of: 6, tied: true }, 'union'),
      'Rank among your drafts: tied 1st of 6 runs and saved drafts of this script (by health)',
    );
  });

  it('ranked + unscored — appends the "N of M ... are/is unranked" note', () => {
    assert.equal(
      draftRankSentence({ rank: 1, of: 3, unscored: 2 }, 'union'),
      'Rank among your drafts: 1st of 3 runs and saved drafts of this script (by health) — '
        + '2 of 5 runs and saved drafts of this script are unranked (saved without a fresh diagnosis)',
    );
    // Singular unscored count uses "is", not "are" — unrankedDraftsNote()'s
    // own contract, exercised here through the composed sentence.
    assert.match(draftRankSentence({ rank: 1, of: 3, unscored: 1 }, 'union'), /1 of 4 .* is unranked/);
  });

  it('first draft (of <= 1) — no fabricated rank, names the next opportunity', () => {
    assert.equal(
      draftRankSentence({ rank: 1, of: 1 }, 'union'),
      'First saved draft — rank among your drafts appears after your next run or save',
    );
  });

  it('nothing scored yet (rank: null) — distinct from "first draft", never claims a save alone will fix it', () => {
    assert.equal(
      draftRankSentence({ rank: null, of: 0, unscored: 3 }, 'union'),
      '3 saved drafts have no score yet — run the doctor before saving to rank them',
    );
    assert.equal(
      draftRankSentence({ rank: null, of: 0, unscored: 1 }, 'union'),
      '1 saved draft has no score yet — run the doctor before saving to rank them',
    );
  });
});

describe("draftRankSentence() — 'saved' scope, every DraftRank state", () => {
  it("draftRankDenominatorLabel('union') ends with draftRankDenominatorLabel('saved') — the two scopes share every word except \"runs and\", proven structurally rather than by two independent literals", () => {
    const union = draftRankDenominatorLabel('union');
    const saved = draftRankDenominatorLabel('saved');
    assert.notEqual(union, saved, "the two scopes must actually differ — otherwise 'saved' is pointless");
    assert.ok(union.endsWith(saved), `expected "${union}" to end with "${saved}"`);
  });

  it('ranked, untied, no unscored siblings — differs from the union-scope sentence for the identical rank/of', () => {
    const draftRank = { rank: 1, of: 2 };
    const saved = draftRankSentence(draftRank, 'saved');
    const union = draftRankSentence(draftRank, 'union');
    assert.equal(saved, 'Ranks 1st of 2 by health among your saved drafts of this script');
    assert.notEqual(saved, union, 'the "saved" and "union" scoped sentences must not collide for the same input');
  });

  // 2026-09-05 (client-hunter B-12) — the exact two states the bug report
  // named: "two identical saves both show 'Ranks 1st of 2'" (no tied
  // prefix) and "three Versions on screen, one unscored, both lines say
  // 'of 2'" (no unranked note).
  it('tied — a genuine dead heat between two saved Versions must not read as clean separation', () => {
    assert.equal(
      draftRankSentence({ rank: 1, of: 2, tied: true }, 'saved'),
      'Ranks tied 1st of 2 by health among your saved drafts of this script',
    );
  });

  it('ranked + unscored — an unscored sibling Version must not silently vanish from the count, and must use the SAVED-scope noun (not the union one)', () => {
    const sentence = draftRankSentence({ rank: 1, of: 2, unscored: 1 }, 'saved');
    assert.equal(
      sentence,
      'Ranks 1st of 2 by health among your saved drafts of this script — '
        + '1 of 3 saved drafts of this script is unranked (saved without a fresh diagnosis)',
    );
    assert.ok(!sentence.includes('runs and'), 'the unranked-drafts note must use the "saved" scope noun, not fall back to the union one');
  });

  it('"only saved draft" (rank null, or of <= 1): its own sentence, not a mis-scoped draft-rank-copy.ts phrase', () => {
    assert.equal(draftRankSentence({ rank: null, of: 0 }, 'saved'), 'Only saved draft with a health score so far');
    assert.equal(draftRankSentence({ rank: 1, of: 1 }, 'saved'), 'Only saved draft with a health score so far');
  });
});

describe('draft-rank-copy.ts — every consumer calls draftRankSentence() rather than composing its own copy', () => {
  it('ScriptDoctorPanel.tsx, coverage-html.ts, and SnapshotManager.tsx all call draftRankSentence(...) — none still builds the sentence from ordinal()/denominator()/next-opportunity()/unranked-note() directly', () => {
    for (const [name, src] of [
      ['ScriptDoctorPanel.tsx', panelSrc],
      ['coverage-html.ts', coverageHtmlSrc],
      ['SnapshotManager.tsx', snapshotManagerSrc],
    ] as const) {
      assert.match(src, /draftRankSentence\(/, `${name} must call draftRankSentence()`);
    }
    assert.match(panelSrc, /draftRankSentence\(draftRank,\s*'union'\)/);
    assert.match(coverageHtmlSrc, /draftRankSentence\(draftRank,\s*'union'\)/);
    assert.match(snapshotManagerSrc, /draftRankSentence\(draftRank,\s*'saved'\)/);
  });
});

describe('draft-rank-copy.ts — coverage HTML renders draftRankSentence() verbatim, for every wire-legal DraftRank state', () => {
  for (const { name, draftRank } of UNION_WIRE_CASES) {
    it(`${name}: the exported HTML contains exactly draftRankSentence(draftRank, 'union')`, () => {
      const html = renderCoverageHtml(minimalReport(), 'Consistency Check', { draftRank });
      const expected = draftRankSentence(draftRank, 'union');
      assert.ok(
        html.includes(expected),
        `expected the exported HTML to contain "${expected}" — got the draft-rank line: ` +
          `${html.match(/<div class="health-percentile">((?:(?!<\/div>).)*)<\/div>\s*<\/div>/s)?.[1] ?? '(not found)'}`,
      );
    });
  }
});

describe('draft-rank-copy.ts — coverage LETTER shares the same core fragments as draftRankSentence(), for every wire-legal DraftRank state', () => {
  // The letter wraps the same fields in a longer caveat sentence ("Among
  // your own X, this one ranks/ties for Nth of M by health — a comparison
  // to your own history...") rather than the compact label
  // draftRankSentence() renders, so it is not byte-identical — that
  // difference is deliberate (see tests/core/percentile-copy-consistency
  // .test.ts's note on why coverage-letter.ts does not call
  // draftRankSentence() itself) — but it must share the exact same core
  // fragments: the ordinal, the denominator noun, the tied/ranks wording,
  // and the unranked-drafts note, all read off the SAME granular helpers
  // draftRankSentence() is composed from.
  for (const { name, draftRank } of UNION_WIRE_CASES) {
    it(`${name}: the letter contains the same ordinal/denominator/tied/unranked-note fragments as draftRankSentence()`, () => {
      const { markdown } = renderCoverageLetter(minimalReport(), { title: 'Consistency Check', draftRank });
      if (draftRank.of <= 1) {
        assert.match(markdown, new RegExp(`rank among your own drafts will appear after ${draftRankNextOpportunityLabel()}`, 'i'));
        return;
      }
      const verb = draftRank.tied ? 'ties for' : 'ranks';
      assert.ok(
        markdown.includes(`${verb} ${ordinal(draftRank.rank as number)} of ${draftRank.of} `) ||
          markdown.includes(`${verb} ${ordinal(draftRank.rank as number)} of ${draftRank.of}`),
        `expected the letter to contain "${verb} ${ordinal(draftRank.rank as number)} of ${draftRank.of}" — got: ${markdown}`,
      );
      assert.ok(markdown.includes(draftRankDenominatorLabel()), 'the letter must use the shared denominator label');
      const note = unrankedDraftsNote(draftRank.unscored ?? 0, draftRank.of);
      if (note) {
        assert.ok(markdown.includes(note), `expected the letter to contain the unranked-drafts note "${note}"`);
      }
    });
  }
});
