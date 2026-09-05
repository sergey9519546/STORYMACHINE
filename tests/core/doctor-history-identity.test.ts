// Draft History script identity (B-3/B-4/B-5/B-6, 2026-09-05).
//
// The bug this pins: `sm_doctor_history_v1` is one global localStorage array,
// and nothing asked which SCRIPT an entry was a run of — so a writer looking
// at "Script Beta" was told "Rank among your drafts: 3rd of 3 runs and saved
// drafts of this script (by health)" with the other two being an unrelated
// screenplay and the built-in demo, all three rows labelled "Dead Frequency"
// (the host project's title, not the analyzed document's).
//
// Two layers, deliberately:
//   1. The pure identity/grouping module (real behaviour, both directions).
//   2. Source-level assertions on the two components that wire it up — the
//      convention this repo already uses for React behaviour it cannot render
//      (see coverage-handoff.test.ts / shape-rhythm-panel-copy.test.ts).
// The browser half of the proof lives in scripts/smoke-p0-live-flow.mjs, which
// drives the golden path and fails when the sample lands in Draft History, is
// analysed twice, is ranked, or offers "Verify my rewrite".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  SCRIPT_KEY_EDITOR,
  SCRIPT_KEY_SAMPLE,
  analyzedScriptIdentity,
  computeSampleContentHash,
  entryScriptKey,
  fileNameStem,
  groupHistoryByScript,
  normalizeScriptName,
  type KeyedHistoryRecord,
} from '../../src/lib/doctor-history-identity.ts';
import { computeDraftRank } from '../../src/lib/snapshot-trend.ts';

const read = (rel: string) => readFileSync(resolve(import.meta.dirname, rel), 'utf8');
const panel = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');
const coverageSummary = read('../../src/components/scriptide/CoverageSummary.tsx');
const p0Smoke = read('../../scripts/smoke-p0-live-flow.mjs');

let clock = 1_000;
function entry(over: Partial<KeyedHistoryRecord> & { health?: number } = {}): KeyedHistoryRecord & { health: number } {
  clock += 1_000;
  return {
    at: clock,
    title: 'Untitled',
    contentHash: `hash-${clock}`,
    health: 50,
    ...over,
  };
}

describe('analyzedScriptIdentity — which script a report is a report OF', () => {
  it('gives the editor draft one stable key regardless of its title', () => {
    const a = analyzedScriptIdentity({ kind: 'editor', hostTitle: 'Dead Frequency' });
    const b = analyzedScriptIdentity({ kind: 'editor', hostTitle: 'Renamed Later' });
    assert.equal(a.key, SCRIPT_KEY_EDITOR);
    assert.equal(b.key, SCRIPT_KEY_EDITOR);
    // The title still travels with it — that is what the history row shows.
    assert.equal(a.title, 'Dead Frequency');
    assert.equal(b.title, 'Renamed Later');
  });

  it('falls back to "Untitled" rather than an empty label for an unnamed editor draft', () => {
    assert.equal(analyzedScriptIdentity({ kind: 'editor', hostTitle: '   ' }).title, 'Untitled');
  });

  it('keys the built-in sample separately from everything the writer wrote', () => {
    const sample = analyzedScriptIdentity({ kind: 'sample', sampleTitle: 'Dead Frequency' });
    assert.equal(sample.key, SCRIPT_KEY_SAMPLE);
    assert.notEqual(sample.key, SCRIPT_KEY_EDITOR);
    assert.equal(sample.title, 'Dead Frequency');
  });

  it('keys an upload by the document\'s OWN title, not by the host project title', () => {
    const alpha = analyzedScriptIdentity({ kind: 'upload', fileName: 'alpha.fountain', ownTitle: 'Script Alpha' });
    const beta = analyzedScriptIdentity({ kind: 'upload', fileName: 'beta.fountain', ownTitle: 'Script Beta' });
    assert.notEqual(alpha.key, beta.key, 'two different scripts must never share a key');
    assert.equal(alpha.title, 'Script Alpha');
    assert.equal(beta.title, 'Script Beta');
    assert.notEqual(alpha.key, SCRIPT_KEY_EDITOR);
  });

  it('recognizes the same script re-uploaded under a different filename', () => {
    const first = analyzedScriptIdentity({ kind: 'upload', fileName: 'alpha.fountain', ownTitle: 'Script Alpha' });
    const revised = analyzedScriptIdentity({ kind: 'upload', fileName: 'alpha-rev2.fountain', ownTitle: 'script  alpha' });
    assert.equal(revised.key, first.key, 'a revision of the same titled script ranks against its earlier runs');
  });

  it('falls back to the filename stem when the upload carries no title page', () => {
    const noTitle = analyzedScriptIdentity({ kind: 'upload', fileName: 'alpha.fountain', ownTitle: null });
    assert.equal(noTitle.title, 'alpha');
    assert.notEqual(
      noTitle.key,
      analyzedScriptIdentity({ kind: 'upload', fileName: 'beta.fountain', ownTitle: null }).key,
    );
  });

  it('never collapses an untitled, unnamed upload into the editor draft', () => {
    const nothing = analyzedScriptIdentity({ kind: 'upload', fileName: '', ownTitle: null });
    assert.notEqual(nothing.key, SCRIPT_KEY_EDITOR);
    assert.notEqual(nothing.key, SCRIPT_KEY_SAMPLE);
  });

  // ── The key's four known limits (module header). These two pin the pair a
  // reader is most likely to hit; limits 3 (the editor key survives a
  // wholesale draft replacement) and 4 (titleless uploads split per filename)
  // are pinned by the editor-key and filename-stem tests above.
  it('LIMIT: two different uploads that share a title are ONE script to this module', () => {
    const mine = analyzedScriptIdentity({ kind: 'upload', fileName: 'mine.fountain', ownTitle: 'Nightfall' });
    const theirs = analyzedScriptIdentity({ kind: 'upload', fileName: 'someone-elses.fdx', ownTitle: 'Nightfall' });
    assert.equal(
      theirs.key,
      mine.key,
      'documented trade: a revision re-uploaded under a new filename keeps its history, at the cost of merging two unrelated scripts that share a title page',
    );
  });

  it('LIMIT: the same script analyzed as an upload and in the editor keys APART', () => {
    const uploaded = analyzedScriptIdentity({ kind: 'upload', fileName: 'nightfall.fountain', ownTitle: 'Nightfall' });
    const inEditor = analyzedScriptIdentity({ kind: 'editor', hostTitle: 'Nightfall' });
    assert.notEqual(
      uploaded.key,
      inEditor.key,
      'documented limit: one script worked on both ways has two histories — undercounting, never merging a demo or another writer\'s draft in on a title match',
    );
    assert.equal(inEditor.key, SCRIPT_KEY_EDITOR);
  });

  it('normalizes names for keying (case and whitespace) but not for display', () => {
    assert.equal(normalizeScriptName('  Script   Alpha '), 'script alpha');
    assert.equal(normalizeScriptName(null), '');
    assert.equal(fileNameStem('alpha.fountain'), 'alpha');
    assert.equal(fileNameStem('My Script.final.fdx'), 'My Script.final');
    assert.equal(fileNameStem('Act 2.5'), 'Act 2.5', 'a dotted title with no real extension survives');
  });
});

describe('entryScriptKey — reading an entry recorded before keying existed', () => {
  it('reports null (not a guess) for a pre-migration entry', () => {
    assert.equal(entryScriptKey(entry({ title: 'Dead Frequency' })), null);
  });

  it('reports the stored key for a post-migration entry', () => {
    assert.equal(entryScriptKey(entry({ scriptKey: 'upload:script alpha' })), 'upload:script alpha');
  });

  it('attributes a legacy entry to the sample when its contentHash IS the sample', () => {
    const legacySample = entry({ title: 'Dead Frequency', contentHash: 'sample-hash' });
    assert.equal(entryScriptKey(legacySample, 'sample-hash'), SCRIPT_KEY_SAMPLE);
    // …and leaves it legacy when the hash could not be computed at all.
    assert.equal(entryScriptKey(legacySample, null), null);
  });

  it('does not mistake a writer\'s own draft for the sample', () => {
    assert.equal(entryScriptKey(entry({ scriptKey: SCRIPT_KEY_EDITOR }), 'sample-hash'), SCRIPT_KEY_EDITOR);
  });
});

describe('groupHistoryByScript — the ONE object behind both counts', () => {
  const legacySample = entry({ title: 'Dead Frequency', contentHash: 'sample-hash', health: 78 });
  const alpha1 = entry({ title: 'Script Alpha', scriptKey: 'upload:script alpha', health: 65 });
  const beta1 = entry({ title: 'Script Beta', scriptKey: 'upload:script beta', health: 62 });
  const alpha2 = entry({ title: 'Script Alpha', scriptKey: 'upload:script alpha', health: 67 });
  const unkeyed = entry({ title: 'Dead Frequency', health: 40 });
  const all = [legacySample, alpha1, beta1, alpha2, unkeyed];

  it('scopes the rank\'s history side to the script on screen', () => {
    const view = groupHistoryByScript(all, 'upload:script beta', 'Script Beta', 'sample-hash');
    assert.deepEqual(view.currentEntries.map((e) => e.health), [62]);
    assert.equal(view.currentCount, 1);
  });

  it('reconciles: currentCount + elsewhereCount === totalCount === every stored row', () => {
    for (const key of ['upload:script beta', 'upload:script alpha', SCRIPT_KEY_EDITOR]) {
      const view = groupHistoryByScript(all, key, 'Whatever', 'sample-hash');
      assert.equal(view.currentCount + view.elsewhereCount, view.totalCount, key);
      assert.equal(view.totalCount, all.length, key);
      assert.equal(
        view.groups.reduce((n, g) => n + g.entries.length, 0),
        all.length,
        `${key}: every entry stays listed — nothing is dropped by grouping`,
      );
    }
  });

  it('lists the current script first, then other scripts, then the sample, then unkeyed entries', () => {
    const view = groupHistoryByScript(all, 'upload:script alpha', 'Script Alpha', 'sample-hash');
    assert.deepEqual(view.groups.map((g) => g.kind), ['current', 'other', 'sample', 'legacy']);
    assert.equal(view.groups[0].title, 'Script Alpha');
    assert.equal(view.groups[1].title, 'Script Beta');
    assert.match(view.groups[2].title, /Built-in sample/);
    assert.match(view.groups[3].title, /Earlier drafts/);
  });

  it('orders every group newest-first, the way the list renders', () => {
    const view = groupHistoryByScript(all, 'upload:script alpha', 'Script Alpha', 'sample-hash');
    assert.deepEqual(view.groups[0].entries.map((e) => e.health), [67, 65]);
  });

  it('keeps the sample out of the current script even when the sample IS on screen', () => {
    // Nothing records the sample any more, but a legacy row can still exist.
    const view = groupHistoryByScript(all, SCRIPT_KEY_EDITOR, 'My Draft', 'sample-hash');
    assert.equal(view.currentCount, 0);
    assert.ok(view.groups.every((g) => g.kind !== 'current'));
    assert.equal(view.elsewhereCount, all.length);
  });

  it('reproduces the hunter\'s states 2 and 3 honestly once scoped', () => {
    // STATE 2: the first run of Script Alpha, with the sample already stored.
    const alphaView = groupHistoryByScript([legacySample, alpha1], 'upload:script alpha', 'Script Alpha', 'sample-hash');
    const alphaRank = computeDraftRank([], alphaView.currentEntries, 65, alpha1.contentHash, alpha1.at);
    assert.deepEqual(alphaRank, { rank: 1, of: 1, tied: false, unscored: 0 }, 'a first run is a first draft, not "2nd of 2"');

    // STATE 3: a DIFFERENT script — Alpha and the sample must not count.
    const betaView = groupHistoryByScript([legacySample, alpha1, beta1], 'upload:script beta', 'Script Beta', 'sample-hash');
    const betaRank = computeDraftRank([], betaView.currentEntries, 62, beta1.contentHash, beta1.at);
    assert.deepEqual(betaRank, { rank: 1, of: 1, tied: false, unscored: 0 }, 'was "3rd of 3 … of this script"');

    // STATE 4: a second run of Alpha DOES rank, against Alpha alone.
    const alpha2View = groupHistoryByScript(all, 'upload:script alpha', 'Script Alpha', 'sample-hash');
    const alpha2Rank = computeDraftRank([], alpha2View.currentEntries, 67, alpha2.contentHash, alpha2.at);
    assert.equal(alpha2Rank?.rank, 1);
    assert.equal(alpha2Rank?.of, 2, 'ranks against the writer\'s OWN earlier run of the same script');
  });

  it('titles an other-script group from its most recent run', () => {
    const renamedOld = entry({ title: 'Working Title', scriptKey: 'upload:script beta' });
    const renamedNew = entry({ title: 'Script Beta', scriptKey: 'upload:script beta' });
    const view = groupHistoryByScript([renamedOld, renamedNew], SCRIPT_KEY_EDITOR, 'My Draft');
    assert.equal(view.groups[0].title, 'Script Beta');
  });

  it('returns an empty view for an empty store', () => {
    const view = groupHistoryByScript([], SCRIPT_KEY_EDITOR, 'My Draft', 'sample-hash');
    assert.deepEqual(view.groups, []);
    assert.equal(view.totalCount, 0);
    assert.equal(view.currentCount, 0);
    assert.equal(view.elsewhereCount, 0);
  });
});

describe('computeSampleContentHash', () => {
  it('computes the same sha256-of-trimmed-text the server stamps as contentHash', async () => {
    const text = '  Title: Dead Frequency\n\nINT. STUDIO - NIGHT\n  ';
    const expected = createHash('sha256').update(text.trim()).digest('hex');
    assert.equal(await computeSampleContentHash(text), expected);
  });

  it('degrades to null rather than throwing when WebCrypto is unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    try {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
      assert.equal(await computeSampleContentHash('anything'), null);
    } finally {
      if (original) Object.defineProperty(globalThis, 'crypto', original);
    }
  });
});

describe('ScriptDoctorPanel wires the identity through (source-level)', () => {
  it('stamps every new history entry with the analyzed script\'s key and its own title', () => {
    assert.match(panel, /function recordDoctorHistory\(\s*report: ScriptDoctorReport,\s*script: AnalyzedScript,/);
    assert.match(panel, /title: script\.title\.trim\(\) \|\| "Untitled",/);
    assert.match(panel, /scriptKey: script\.key,/);
    assert.ok(
      !/recordDoctorHistory\(data, effectiveTitle/.test(panel),
      'the host project title must no longer be what a history row is labelled with',
    );
  });

  it('keeps a pre-migration entry (no scriptKey) valid on read — migration is additive', () => {
    assert.match(panel, /entry\.scriptKey === undefined \|\| \(typeof entry\.scriptKey === "string"/);
  });

  it('scopes the rank to this script\'s runs and excludes the sample entirely', () => {
    assert.match(panel, /reportIsComplete && report && !analyzedIsSample/);
    assert.match(panel, /computeDraftRank\(rankSnapshots, historyView\.currentEntries,/);
  });

  it('lets ScriptIDE snapshots into the union only for the editor draft', () => {
    assert.match(panel, /currentScript\.key === SCRIPT_KEY_EDITOR \? snapshots \?\? \[\] : \[\]/);
  });

  it('renders an honest line for the sample instead of a rank or a silent gap', () => {
    assert.match(panel, /The sample is not ranked against your drafts/);
    assert.match(panel, /function DraftRankOrSampleNote\(/);
    // Both render sites go through the one component.
    assert.equal((panel.match(/<DraftRankOrSampleNote /g) ?? []).length, 2);
    assert.ok(!/\{draftRank && <DraftRankLine /.test(panel), 'no un-gated rank line may remain');
  });

  it('renders the Draft History button count and the list from the same computed object', () => {
    assert.match(panel, /historyView\.currentCount\} run\{historyView\.currentCount === 1 \? "" : "s"\} of this script/);
    assert.match(panel, /historyView\.elsewhereCount > 0 &&/);
    assert.match(panel, /historyView\.groups\.map\(\(group\) => \{/);
    assert.ok(
      !/\{history\.length\} draft\{history\.length === 1/.test(panel),
      'the button must not count every script\'s runs under this script\'s heading',
    );
  });

  it('decides the Verify withhold from the REPORT\'s provenance before any upload state', () => {
    const sampleBranch = panel.indexOf(': analyzedIsSample');
    const uploadBranch = panel.indexOf(': uploadedFile\n');
    assert.ok(sampleBranch > -1, 'verifyBlockedReason must branch on analyzedIsSample');
    assert.ok(uploadBranch > -1, 'verifyBlockedReason must still branch on uploadedFile');
    assert.ok(sampleBranch < uploadBranch, 'provenance is decided before format/upload state');
    // Both ways out are named honestly — the threaded sample has no ✕ chip.
    assert.match(panel, /Dismiss the sample \(✕ above\)/);
    assert.match(panel, /Replace the editor's text with your own draft/);
  });

  it('prints the fix receipt\'s health endpoints at the delta\'s own precision', () => {
    assert.match(panel, /Health \{before\.health\.toFixed\(1\)\} &rarr; \{after\.health\.toFixed\(1\)\}/);
    assert.ok(
      !/Health \{Math\.round\(before\.health\)\}/.test(panel),
      'whole-number endpoints beside a one-decimal delta do not add up on screen',
    );
  });
});

describe('CoverageSummary cannot downgrade a sample run\'s provenance (source-level)', () => {
  it('claims the run\'s provenance before the request goes out', () => {
    assert.match(coverageSummary, /const isSampleRun = !!override\?\.sample;/);
    assert.match(coverageSummary, /sampleRunRef\.current = isSampleRun;/);
    assert.match(coverageSummary, /lastRunTextRef\.current = text;/);
    assert.match(coverageSummary, /isSample: isSampleRun,/);
    assert.ok(
      !/isSample: !!override\?\.sample/.test(coverageSummary),
      'the handed-up report\'s provenance must come from the run, not a second read of the argument',
    );
  });

  it('guards the effect\'s fallthrough so the sample is never re-run as a plain run', () => {
    assert.match(coverageSummary, /if \(sampleRunRef\.current\) return;/);
    assert.match(coverageSummary, /lastRunTextRef\.current === fountain\.trim\(\)\) return;/);
  });
});

describe('the golden path is asserted in the browser, not only in source', () => {
  it('smoke-p0-live-flow.mjs counts doctor runs and reads Draft History', () => {
    assert.match(p0Smoke, /doctorStreamPosts/);
    assert.match(p0Smoke, /sm_doctor_history_v1/);
    assert.match(p0Smoke, /The sample is not ranked against your drafts/);
    assert.match(p0Smoke, /Verify my rewrite/);
  });
});
