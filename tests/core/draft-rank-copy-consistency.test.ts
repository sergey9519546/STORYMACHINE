// src/lib/draft-rank-copy.ts — cross-surface proof that the panel
// (ScriptDoctorPanel.tsx's DraftRankLine), the coverage LETTER
// (coverage-letter.ts's buildCaveats) and the coverage HTML export
// (coverage-html.ts's buildDraftRankLine) render the SAME thing for the
// same DraftRank input, for all four states the schema can carry:
//   - ranked (no tie, no unscored records)
//   - tied (>= 1 other counted draft shares the exact same health)
//   - ranked + unscored (some saved records carry no health at all)
//   - first draft (of <= 1 — nothing else saved yet to rank against)
//
// Written after the finding that coverage-html.ts's buildDraftRankLine was
// added by the cross-surface-parity lane BEFORE this module existed and was
// never migrated once the panel and the letter moved onto it — see
// draft-rank-copy.ts's own header for the drift story, and
// tests/core/coverage-html.test.ts / tests/core/coverage-letter.test.ts for
// each surface's own per-state tests. This file is the one place that
// checks all three AGAINST EACH OTHER for the identical input, the way
// tests/core/percentile-copy-consistency.test.ts already does for the
// percentile line.
//
// No React render harness exists in this repo (see tests/core/
// shape-rhythm-panel-copy.test.ts's own header), so the panel side is
// proven by executing the SAME formula ScriptDoctorPanel.tsx's DraftRankLine
// uses — built ONLY from the shared draft-rank-copy.ts functions plus the
// shared ordinal(), with no hand-written literal of its own — and then
// asserting the panel's source text actually contains that exact formula
// (so a future edit to the panel's wording fails THIS test, not silently
// drifts past it). The letter and the HTML export are pure functions, so
// their sides are proven by actually calling them.
//
// 2026-09-05 (owner rule: one wording per concept) — a FIFTH surface,
// SnapshotManager.tsx's per-snapshot badge, ranks against a NARROWER
// denominator than the other four (saved Versions only, never Draft History
// runs — snapshotDraftRanks calls computeDraftRank with an empty history
// array). draftRankDenominatorLabel(scope) exists so that narrower noun is
// still ONE shared implementation, not a second hand-copy: this file's last
// describe block proves the 'saved' scope is (a) what SnapshotManager.tsx
// actually calls and (b) genuinely a suffix of the 'union' scope's phrase
// ("runs and saved drafts of this script" ends with "saved drafts of this
// script"), so the two scopes can never silently diverge on the words they
// share.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ordinal } from '../../src/lib/percentile-copy.ts';
import {
  draftRankDenominatorLabel, draftRankNextOpportunityLabel, unrankedDraftsNote,
} from '../../src/lib/draft-rank-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import type { ScriptDoctorReport, DoctorGrade, CoverageVerdict } from '../../server/nvm/analyze/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');
const panelSrc = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
const snapshotManagerSrc = read('../../src/components/scriptide/SnapshotManager.tsx');

type DraftRankInput = { rank: number; of: number; tied?: boolean; unscored?: number };

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

/** ScriptDoctorPanel.tsx's DraftRankLine `text` computation, reproduced
 *  exactly (see that component's own header comment for the three-state
 *  contract) — built entirely from the shared ordinal()/
 *  draftRankDenominatorLabel()/draftRankNextOpportunityLabel(), never a
 *  literal of its own, so this IS the panel's formula, not a second
 *  implementation of it. The "panel source contains this exact shape"
 *  assertions below are what keep this honest if the component ever
 *  changes. */
function expectedPanelLine(draftRank: DraftRankInput): string {
  const { rank, of, tied, unscored } = draftRank;
  const text = of <= 1
    ? `First saved draft — rank among your drafts appears after ${draftRankNextOpportunityLabel()}`
    : `Rank among your drafts: ${tied ? 'tied ' : ''}${ordinal(rank)} of ${of} ${draftRankDenominatorLabel()} (by health)`;
  const note = of > 1 ? unrankedDraftsNote(unscored ?? 0, of) : null;
  return note ? `${text} — ${note}` : text;
}

const CASES: Array<{ name: string; draftRank: DraftRankInput }> = [
  { name: 'ranked', draftRank: { rank: 2, of: 5 } },
  { name: 'tied', draftRank: { rank: 1, of: 6, tied: true } },
  { name: 'ranked + unscored', draftRank: { rank: 1, of: 3, unscored: 2 } },
  { name: 'first draft', draftRank: { rank: 1, of: 1 } },
];

describe('draft-rank-copy.ts — panel formula matches the panel source text', () => {
  it('ScriptDoctorPanel.tsx\'s DraftRankLine ternary matches this reproduction verbatim (fails if the component\'s wording changes without this test changing too)', () => {
    assert.match(
      panelSrc,
      /`Rank among your drafts: \$\{draftRank\.tied \? "tied " : ""\}\$\{ordinal\(draftRank\.rank\)\} of \$\{draftRank\.of\} \$\{draftRankDenominatorLabel\(\)\} \(by health\)`/,
    );
    assert.match(
      panelSrc,
      /`First saved draft — rank among your drafts appears after \$\{draftRankNextOpportunityLabel\(\)\}`/,
    );
    assert.match(panelSrc, /unrankedDraftsNote\(draftRank\.unscored, draftRank\.of\)/);
  });
});

describe('draft-rank-copy.ts — coverage HTML renders the panel line verbatim, for every DraftRank state', () => {
  for (const { name, draftRank } of CASES) {
    it(`${name}: the exported HTML contains the exact panel-line text`, () => {
      const html = renderCoverageHtml(minimalReport(), 'Consistency Check', { draftRank });
      const expected = expectedPanelLine(draftRank);
      assert.ok(
        html.includes(expected),
        `expected the exported HTML to contain "${expected}" — got the draft-rank line: ` +
          `${html.match(/<div class="health-percentile">((?:(?!<\/div>).)*)<\/div>\s*<\/div>/s)?.[1] ?? '(not found)'}`,
      );
    });
  }
});

describe('draft-rank-copy.ts — coverage LETTER shares the same core fragments as the panel, for every DraftRank state', () => {
  // The letter wraps the same number in a longer caveat sentence
  // ("Among your own X, this one ranks/ties for Nth of M by health — a
  // comparison to your own history...") rather than the panel/HTML's short
  // label, so it is not byte-identical to expectedPanelLine() — but it must
  // share the exact same core fragments: the ordinal, the denominator noun,
  // the tied/ranks wording, and the unranked-drafts note, all read off the
  // SAME shared functions.
  for (const { name, draftRank } of CASES) {
    it(`${name}: the letter contains the same ordinal/denominator/tied/unranked-note fragments as the panel`, () => {
      const { markdown } = renderCoverageLetter(minimalReport(), { title: 'Consistency Check', draftRank });
      if (draftRank.of <= 1) {
        assert.match(markdown, new RegExp(`rank among your own drafts will appear after ${draftRankNextOpportunityLabel()}`, 'i'));
        return;
      }
      const verb = draftRank.tied ? 'ties for' : 'ranks';
      assert.ok(
        markdown.includes(`${verb} ${ordinal(draftRank.rank)} of ${draftRank.of} `) ||
          markdown.includes(`${verb} ${ordinal(draftRank.rank)} of ${draftRank.of}`),
        `expected the letter to contain "${verb} ${ordinal(draftRank.rank)} of ${draftRank.of}" — got: ${markdown}`,
      );
      assert.ok(markdown.includes(draftRankDenominatorLabel()), 'the letter must use the shared denominator label');
      const note = unrankedDraftsNote(draftRank.unscored ?? 0, draftRank.of);
      if (note) {
        assert.ok(markdown.includes(note), `expected the letter to contain the unranked-drafts note "${note}"`);
      }
    });
  }
});

/** SnapshotManager.tsx's SnapshotPercentileAndRankLine `text` computation,
 *  reproduced exactly — mirrors expectedPanelLine() above but for the
 *  'saved' scope (see draft-rank-copy.ts's DraftRankDenominatorScope
 *  header): SnapshotManager has no first-draft/tied/unranked-note branches
 *  of its own (that null-rank case renders its own distinct sentence, "Only
 *  saved draft with a health score so far", not owned by draft-rank-copy.ts). */
function expectedSnapshotManagerLine(draftRank: { rank: number | null; of: number }): string {
  if (draftRank.rank === null || draftRank.of <= 1) return 'Only saved draft with a health score so far';
  return `Ranks ${ordinal(draftRank.rank)} of ${draftRank.of} by health among your ${draftRankDenominatorLabel('saved')}`;
}

describe("draft-rank-copy.ts — the 'saved' scope: SnapshotManager.tsx's per-snapshot badge", () => {
  it("draftRankDenominatorLabel('union') ends with draftRankDenominatorLabel('saved') — the two scopes share every word except \"runs and\", proven structurally rather than by two independent literals", () => {
    const union = draftRankDenominatorLabel('union');
    const saved = draftRankDenominatorLabel('saved');
    assert.notEqual(union, saved, "the two scopes must actually differ — otherwise 'saved' is pointless");
    assert.ok(union.endsWith(saved), `expected "${union}" to end with "${saved}"`);
  });

  it("SnapshotManager.tsx's source contains the exact formula this reproduction uses (fails if the component's wording changes without this test changing too)", () => {
    assert.match(
      snapshotManagerSrc,
      /`Ranks \$\{ordinal\(draftRank\.rank\)\} of \$\{draftRank\.of\} by health among your \$\{draftRankDenominatorLabel\('saved'\)\}`/,
    );
    assert.ok(snapshotManagerSrc.includes('"Only saved draft with a health score so far"'));
  });

  it('ranked (saved scope): the reproduction differs from the union-scope panel line for the identical rank/of, proving the two surfaces are not silently sharing one denominator', () => {
    const draftRank = { rank: 1, of: 2 };
    const savedLine = expectedSnapshotManagerLine(draftRank);
    const unionLine = expectedPanelLine(draftRank);
    assert.equal(savedLine, 'Ranks 1st of 2 by health among your saved drafts of this script');
    assert.notEqual(savedLine, unionLine, 'the "saved" and "union" scoped sentences must not collide for the same input');
  });

  it('"only saved draft" (rank null or of <= 1): renders its own sentence, not a mis-scoped draft-rank-copy.ts phrase', () => {
    assert.equal(expectedSnapshotManagerLine({ rank: null, of: 0 }), 'Only saved draft with a health score so far');
    assert.equal(expectedSnapshotManagerLine({ rank: 1, of: 1 }), 'Only saved draft with a health score so far');
  });
});
